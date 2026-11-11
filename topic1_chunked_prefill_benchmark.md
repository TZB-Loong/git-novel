# 选题 1（Chunked Prefill 与 PagedAttention 的吞吐博弈）实验设计与压测方案

> **定案标题**：《Chunked Prefill 与 PagedAttention 的吞吐博弈：为什么生产级推理依然逃不过首字与吞吐的互斥诅咒？》  
> **统筹主笔**：@Tuli  
> **实测算力**：@Kaggle 算力手（Kaggle 云端 T4 × 2 运行时）  
> **脚手架提供**：@云端沙盒-Simular（云端盒子环境）  
> **基准模型**：`Qwen/Qwen2.5-7B-Instruct`（稠密架构，官方权重 ~15.2 GB）  
> **目标硬件**：NVIDIA Tesla T4 × 2（TP=2，标称 32 GiB 显存，实际可用约 29.5 GiB）

---

## 1. 核心工程矛盾与理论物理墙

在 LLM 生产推理服务（如 vLLM、SGLang、TGI）中，**Chunked Prefill（分块预填充）**被广泛宣传为打破“长 Prompt 阻塞短请求”的神级优化。其核心设计是将超长 Prompt 切分成多个固定尺寸的 Chunk（如 512 或 1024 tokens），与处于 Decode 阶段的 Token 拼成同一个 Batch 协同执行（Piggybacking）。

然而，该优化在物理底层直接引发了严重的算力与带宽互斥：

```
               【吞吐与延迟的物理边界】
      Prefill 阶段 (Compute-bound)
      ▲ GEMM 矩阵乘法，算力密集，依赖大尺寸 Batch 填满 Tensor Cores
      │
      ├─────────────────────── 生产折衷点 (Pareto Frontier)
      │
      ▼ Memory-bound
      Decode 阶段：每次仅生成 1 个 Token，频繁从 HBM 读取全部 KV Cache
```

1. **算子利用率暴跌（FLOPs 浪费）**：
   Prefill 本质是 Compute-bound（计算受限），只有当输入序列足够长、GEMM 矩阵乘法维度足够大时，GPU Tensor Cores 才能跑出理论峰值算力。一旦 Chunk 尺寸切得过细（如 256 或 512），GEMM 算子退化为显存搬运密集型小算子，GPU 计算利用率剧跌，总吞吐（Tokens/s）雪崩。
2. **调度开销与流水线气泡**：
   切分越细，单个长请求跨越的调度步数（Step）越多，Kernel 启动开销（Launch Overhead）与 CPU-GPU 异步同步开销显著放大。
3. **帕累托互斥曲线**：
   - **追求极致首字延迟（TTFT P99）**：需将 Chunk 切得很小（如 256），避免长请求垄断 GPU，但以牺牲 30%~50% 总吞吐为代价；
   - **追求极致总吞吐（Throughput）**：需增大 Chunk（如 2048/4096）甚至退化为非分块（Baseline），但短请求的首字延迟将出现数十秒的极端尾部尖峰（Tail Latency）。

---

## 2. 基准模型容量与硬件可行性核算（严格基于 7B 口径）

> **特别声明**：本方案严格基于定案的 `Qwen/Qwen2.5-7B-Instruct`，绝不混淆选题 2 的 `Qwen3-30B-A3B` 架构。

### 2.1 Qwen2.5-7B-Instruct 官方架构参数

| 参数项 | 取值 | 物理意义 |
| :--- | :--- | :--- |
| **Model Type** | `qwen2` (`Qwen2ForCausalLM`) | 标准密集自回归因果语言模型 |
| **总参数量** | **7,615,616,512 (约 7.61B)** | Safetensors 原始大小约 15.23 GB |
| **隐藏层层数 ($L$)** | 28 | `num_hidden_layers` |
| **隐藏层维度 ($d_{model}$)** | 3584 | `hidden_size` |
| **注意力头数 ($H_Q$)** | 28 (head_dim = 128) | $28 	imes 128 = 3584$ |
| **KV 头数 ($H_{KV}$)** | 4 (GQA 7:1 分组) | $4 	imes 128 = 512$ |
| **最大上下文长度** | 131072 (128K) | 实验截断测试为 4096 tokens |
| **原生精度** | `bfloat16` / `float16` | 2 字节/参数 |

### 2.2 显存与硬件部署生死判定

1. **单卡 Tesla T4 (16 GB) 物理阻断**：
   - T4 物理显存标称 15,360 MiB（~15.0 GiB）。
   - FP16 权重本身占用 $7.61 	imes 2 = 15.22	ext{ GB}$。
   - vLLM 默认 `gpu_memory_utilization = 0.90` 时，最多申请 13.5 GiB 显存，**单卡连权重都无法完整装入**；若强开 0.98，仅剩 ~200 MB 显存，vLLM 在初始化 PagedAttention 预分配 KV Blocks 时必报 `ValueError: No available memory for the cache blocks` 崩溃。
2. **双卡 Tesla T4 × 2 (TP=2) 稳健部署方案**：
   - 启用张量并行 `tensor_parallel_size = 2`；
   - 每张 T4 分摊模型权重：$15.22 \div 2 = 7.61	ext{ GiB}$；
   - 单卡剩余可用显存：$15.0 - 7.61 pprox 7.39	ext{ GiB}$；
   - 单 Token 的 KV Cache 显存（GQA 4头）：
     $$\text{KV\_per\_token} = 2 \times 28 \times 4 \times 128 \times 2\text{ Bytes} = 57,344\text{ Bytes} \approx 56\text{ KiB/token}$$
     双卡并行后，单卡每 Token 仅占 28 KiB。7.39 GiB 显存可容纳超过 **270,000 Tokens** 的动态 KV 缓存，足以从容支撑并发 16 下的长输入测试。

---

## 3. 压测矩阵与变量设计

实验覆盖 6 档 Chunk 配置 × 2 类真实生产流量 × 3 级并发梯度，共计 **36 组全量测试点**。

### 3.1 实验控制变量

1. **Chunk 尺寸梯度（`--chunk-size`）**：
   - `0`（`baseline`）：关闭 Chunked Prefill（原生 vLLM 批处理，前填充整段执行）；
   - `256`：极细粒度分块（面向极致首字平滑）；
   - `512`：工业推荐轻量分块（社区典型折衷配置）；
   - `1024`：平衡型分块；
   - `2048`：大粒度分块；
   - `4096`：超大分块（逼近全量前填充边界）。
2. **生产流量形态（`--traffic-type`）**：
   - **流量 A（长入短出 · RAG/摘要场景）**：Prompt ~2,048 tokens / Output 64 tokens，来自分布式高密架构技术文档；
   - **流量 B（短入长出 · 代码/智能体场景）**：Prompt ~128 tokens / Output 1,024 tokens，来自复杂工程实现任务指令。
3. **并发请求压力（`--concurrency`）**：
   - `4`（轻载低延迟验证）；
   - `8`（典型中等生产负载）；
   - `16`（饱和高压排队场景）。

### 3.2 核心采集指标定义

每组测试独立记录以下 7 项硬指标：

| 指标字段 | 统计定义 | 生产业务含义 |
| :--- | :--- | :--- |
| `ttft_p50_ms` | 请求发送至收到首个 Token 的时间（P50 分位数） | 交互中位数响应感受 |
| `ttft_p99_ms` | 首字延迟尾部（P99 分位数） | 长 Prompt 阻塞的最恶劣超时尖峰 |
| `itl_p99_ms` | 连续生成 Token 间延迟（P99 分位数） | 流式输出过程中的卡顿感 / 打字机抖动 |
| `throughput_tokens_per_sec` | 批次总生成 Token 数 $\div$ 总耗时 | 整体服务单位算力产出经济效益 |
| `gpu_compute_util_pct` | 压测区间 `nvidia-smi` GPU 计算利用率均值 | 算子 GEMM 饱满度与 FLOPs 效率 |
| `gpu_mem_used_mib` | 压测区间 GPU 显存占用峰值 | 显存水位安全性与碎片率 |
| `chunk_size` | 当前测试档位（baseline, 256 ~ 4096） | 自变量 |

---

## 4. Kaggle 算力预算与资源边界

- **账号当前实测配额**：
  - GPU 额度：已用 18.39h / **剩余 11.61h**（重置周期：2026-11-14 08:00）
  - TPU 额度：剩余 20.00h
- **压测工时预算**：
  - 单次环境初始化与 vLLM 依赖编译：约 3~5 分钟；
  - Qwen2.5-7B 模型权重拉取：约 6~8 分钟（Kaggle 内网或 ModelScope 镜像）；
  - `--probe` 单点探针验证（chunk=512, 并发 4）：约 1 分钟；
  - 36 组全量矩阵循环跑测：每组耗时 3~4 分钟，合计约 120~150 分钟（2.0 ~ 2.5 小时）；
  - **总配额消耗预计**：约 **2.5 小时**，占当前剩余额度的 21.5%，在安全配额之内，不会触发配额熔断。

---

## 5. 复现步骤与可执行脚本

### 步骤 1：本地脚手架补齐 TP 参数
需在 [`benchmark/chunked_prefill/benchmark_worker.py`](file:///Volumes/ssd/git-novel/benchmark/chunked_prefill/benchmark_worker.py) 中，将 `AsyncEngineArgs` 补入张量并行支持：
```python
import torch

engine_args = AsyncEngineArgs(
    model=args.model,
    tensor_parallel_size=torch.cuda.device_count(),  # 适配双卡 T4 x 2
    enable_chunked_prefill=enable_chunked,
    max_num_batched_tokens=chunk_size if enable_chunked else None,
    max_model_len=4096,
    gpu_memory_utilization=0.90,
    trust_remote_code=True,
    disable_log_requests=True,
)
```

### 步骤 2：生成压测样本数据
```bash
cd /Volumes/ssd/git-novel/benchmark/chunked_prefill
python3 generate_prompts.py
```
已在本地生成：
- `prompts_rag_2k.json`（32 组长文档提示词）
- `prompts_code_128.json`（32 组代码生成提示词）

### 步骤 3：Kaggle Kernel 部署与启动
在 Kaggle Notebook 或 CLI 环境中：
```bash
# 1. 探针模式（单组验证打通）
python3 kaggle_vllm_kernel.py --probe

# 2. 全量矩阵跑测
python3 kaggle_vllm_kernel.py
```

### 步骤 4：数据回传与交付契约
跑测完毕后，产物自动保存于：
- `/kaggle/working/benchmark_chunked_prefill_results.json`
- `/kaggle/working/benchmark_chunked_prefill_results.csv`

经 SHA-256 校验无损回传至 `/Volumes/ssd/git-novel/benchmark/chunked_prefill/`，直接供 @Tuli 生成图表与成文。

---

## 6. 真跑实测的前置卡点与就绪检查

当前处于**方案完整就绪，等待脚本补齐与上机执行**状态。真跑前必须满足：
1. **脚手架修复**：[`benchmark/chunked_prefill/benchmark_worker.py`](file:///Volumes/ssd/git-novel/benchmark/chunked_prefill/benchmark_worker.py) 需合入 `tensor_parallel_size=torch.cuda.device_count()`，否则 T4 单卡装载 7B 必 OOM；
2. **Kaggle Kernel 加速器选型**：创建 Kernel 时需明确选定 `GPU T4 x 2` 并开启 `Internet on`，由算力手推建运行。
