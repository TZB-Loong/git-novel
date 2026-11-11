# vLLM Chunked Prefill 生产级基准评测套件

专为探究 **Chunked Prefill 与 PagedAttention 吞吐与首字互斥博弈** 设计，用于实测不同 chunk 档位对首字延迟（TTFT）、字符间抖动（ITL）、生成吞吐及显卡利用率的影响。

## 目录结构
- `generate_prompts.py`: 生产级 Prompt 生成脚本（已预先生成 32 组样本）。
- `prompts_rag_2k.json`: 长入短出测试集（Prompt ~2048 tokens, Output ~64 tokens，对应 RAG / 知识库摘要流）。
- `prompts_code_128.json`: 短入长出测试集（Prompt ~128 tokens, Output ~1024 tokens，对应代码与创作流）。
- `benchmark_worker.py`: 单次配置独立压测执行器（流式打点、TTFT/ITL 百分位数提取、显存监控）。
- `run_benchmark_matrix.py`: 评测矩阵调度器（支持一键探针模式与全量 6 档 Chunk × 2 种流量 × 3 种并发压测）。
- `kaggle_vllm_kernel.py`: Kaggle 一键启动入口脚本。

## 评测矩阵
1. **Chunk 档位**: `baseline` (0), `256`, `512`, `1024`, `2048`, `4096`
2. **流量形态**:
   - `长入短出` (RAG 场景: 2048 in / 64 out)
   - `短入长出` (代码场景: 128 in / 1024 out)
3. **并发档位**: `4`, `8`, `16`

## 使用方法

### 1. 最小探针验证（约 1 分钟，零算力浪费）
```bash
python run_benchmark_matrix.py --probe
```

### 2. 全量矩阵压测（预估 2~2.5 小时）
```bash
python run_benchmark_matrix.py
```

## 输出产物
- `benchmark_chunked_prefill_results.json`
- `benchmark_chunked_prefill_results.csv`
严格对齐 Tuli 规范字段：`chunk_size`, `traffic_type`, `concurrency`, `ttft_p50_ms`, `ttft_p99_ms`, `itl_p99_ms`, `throughput_tokens_per_sec`, `gpu_compute_util_pct`, `gpu_mem_used_mib`。
