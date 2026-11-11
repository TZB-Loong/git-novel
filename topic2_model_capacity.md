# 选题 2（MoE 路由倾斜与负载陷阱）模型容量与显存预核报告

> **目标模型**：`Qwen/Qwen3-30B-A3B`（官方 MoE 架构，总参 30.5B，激活 3.1B）  
> **基准硬件**：单卡 NVIDIA T4 16GB（Kaggle 默认标准算力，标称 16 GiB，实际可用显存约 14.7 ~ 15.0 GiB）  
> **对比硬件**：双卡 NVIDIA T4 × 2（TP=2，标称 32 GiB，可用约 29.5 GiB）

---

## 1. 官方 Config 核心架构参数（零幻觉核对）

数据直接抓取自 Hugging Face 官方仓库 `Qwen/Qwen3-30B-A3B/config.json` 及 `model.safetensors.index.json`：

| 架构参数 | 官方取值 | 备注与推算 |
| :--- | :--- | :--- |
| **Model Type** | `qwen3_moe` (`Qwen3MoeForCausalLM`) | 细粒度专家路由结构 |
| **总参数量** | **30,532,122,624 (约 30.53B)** | 权重 Safetensors 原始大小 61,064,245,248 字节 |
| **激活参数量** | **约 3.14B** | 8/128 专家激活 + Attention/Embedding 稠密层 |
| **隐藏层层数 ($L$)** | 48 | `num_hidden_layers` |
| **隐藏层维度 ($d_{model}$)** | 2048 | `hidden_size` |
| **注意力头数 ($H_Q$)** | 32 (head_dim = 128) | $32 \times 128 = 4096$ |
| **KV 头数 ($H_{KV}$)** | 4 (GQA 分组查询) | $4 \times 128 = 512$ |
| **专家总数 / 激活数** | 128 / 8 (`top_k = 8`) | `num_experts = 128`, `num_experts_per_tok = 8` |
| **单专家维度** | 768 (`moe_intermediate_size`) | $2048 \times 768 \times 3$ 门控/上下投影 |
| **最大上下文长度** | 40960 (40K) | `max_position_embeddings` |
| **原生精度** | `bfloat16` | 16-bit (2 字节/参数) |

---

## 2. KV Cache 显存占用推算公式与梯度

采用 GQA 机制，每个 Token 缓存所需的显存量公式：
$$\text{KV\_per\_token} = 2 \times L \times H_{KV} \times \text{head\_dim} \times \text{bytes\_per\_elem}$$
代入参数：
$$\text{KV\_per\_token} = 2 \times 48 \times 4 \times 128 \times 2\text{ Bytes} = 98,304\text{ Bytes} = 96\text{ KiB/token}$$

| 上下文长度 (Tokens) | FP16 KV Cache (GiB) | FP8 KV Cache (GiB) | 备注 |
| :--- | :--- | :--- | :--- |
| **1,024 (1K)** | 0.094 GiB (96 MiB) | 0.047 GiB | 极短探针测试 |
| **2,048 (2K)** | 0.188 GiB (192 MiB) | 0.094 GiB | 建议 4-bit 极限上限 |
| **4,096 (4K)** | 0.375 GiB (384 MiB) | 0.188 GiB | 路由倾斜基准测试目标 |
| **8,192 (8K)** | 0.750 GiB (768 MiB) | 0.375 GiB | 中长文本 |
| **16,384 (16K)** | 1.500 GiB | 0.750 GiB | 长文本负载 |
| **40,960 (40K)** | 3.750 GiB | 1.875 GiB | 官方上下文全满 |

---

## 3. 16 GB 显存（单卡 T4）可跑性矩阵评估

*注：以基准上下文 4K (KV Cache = 0.38 GiB) 为例；CUDA 上下文及 PyTorch/vLLM 激活运行时预留约 0.8 ~ 1.0 GiB。*

| 档位 | 权重占用 (GiB / GB) | KV Cache (4K) | 运行预留 (CUDA/Act) | 合计显存 (GiB) | 单卡 16GB 结论 | 建议上下文上限 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **FP16 / BF16** (原生) | 56.87 GiB (61.06 GB) | 0.38 GiB | ~1.0 GiB | **58.25 GiB** | ❌ **跑不动 (OOM)** (超限 3.6 倍) | 0 (无法加载) |
| **INT8** (8-bit 量化) | 28.43 GiB (30.53 GB) | 0.38 GiB | ~0.9 GiB | **29.71 GiB** | ❌ **跑不动 (OOM)** (超限 1.8 倍) | 0 (无法加载) |
| **4-bit** (AWQ/GPTQ) | 14.22 GiB (15.27 GB) | 0.38 GiB | ~0.8 GiB | **15.40 GiB** | ⚠️ **需量化 (边缘/极高风险)** | **≤ 2,048 Tokens** |

---

## 4. 关键工程边界与落地建议

1. **4-bit 单卡 T4 极高概率 OOM**：
   - vLLM 默认 `gpu_memory_utilization = 0.90`（在 16GB 卡上仅预留约 14.4 GiB）。
   - 4-bit 纯权重为 14.22 GiB，算上量化元数据（Scales/Zeros 约 0.5 GiB）即达 14.7 GiB，加上 CUDA Context 和 KV Cache 必然超标。
   - 若执意单卡跑 4-bit，必须强开 `gpu_memory_utilization = 0.96` 并将最大上下文卡死在 ≤ 2K。
2. **解法 A（强力推荐）：启用双卡 T4 (TP=2)**：
   - Kaggle 免费算力提供双卡 T4（总显存 32 GB）。
   - 在 TP=2 分布式下，4-bit 权重单卡仅 7.1 GiB，可轻松跑满 8K~16K 上下文；即使 INT8 权重单卡分担 14.2 GiB 也能在 4K 上下文下平稳跑通。
3. **解法 B（备选零风险模型）：切换至 `Qwen1.5-MoE-A2.7B`**：
   - 官方参数：总参 14.3B，激活 2.7B，Safetensors 大小 26.67 GiB。
   - 4-bit 权重仅 **7.1 GiB**，单卡 16GB 剩余显存高达 7+ GiB，上下文可自由拉到 8K，挂钩子采集 Expert 路由分布直方图零 OOM 风险。
