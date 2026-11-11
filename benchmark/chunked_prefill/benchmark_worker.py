import argparse
import asyncio
import json
import os
import subprocess
import threading
import time
import numpy as np

def start_gpu_monitor(interval_sec=0.1):
    stop_event = threading.Event()
    stats = {"util_pct": [], "mem_mib": []}

    def _monitor():
        while not stop_event.is_set():
            try:
                res = subprocess.run(
                    ["nvidia-smi", "--query-gpu=utilization.gpu,memory.used", "--format=csv,noheader,nounits"],
                    capture_output=True, text=True, timeout=1
                )
                if res.returncode == 0:
                    for line in res.stdout.strip().splitlines():
                        parts = [p.strip() for p in line.split(",")]
                        if len(parts) >= 2:
                            stats["util_pct"].append(float(parts[0]))
                            stats["mem_mib"].append(float(parts[1]))
            except Exception:
                pass
            time.sleep(interval_sec)

    t = threading.Thread(target=_monitor, daemon=True)
    t.start()
    return stop_event, stats

async def run_benchmark(args):
    from vllm import AsyncEngineArgs, AsyncLLMEngine, SamplingParams

    chunk_size = args.chunk_size
    enable_chunked = (chunk_size > 0)

    tp_size = args.tensor_parallel_size
    if tp_size <= 0:
        try:
            import torch
            tp_size = torch.cuda.device_count() if torch.cuda.is_available() else 1
        except Exception:
            tp_size = 1
    if tp_size <= 0:
        tp_size = 1

    print(f"Initializing AsyncLLMEngine: tp_size={tp_size}, chunk_size={chunk_size} (enable_chunked_prefill={enable_chunked})")
    engine_args = AsyncEngineArgs(
        model=args.model,
        tensor_parallel_size=tp_size,
        enable_chunked_prefill=enable_chunked,
        max_num_batched_tokens=chunk_size if enable_chunked else None,
        max_model_len=4096,
        gpu_memory_utilization=0.90,
        trust_remote_code=True,
        disable_log_requests=True,
    )
    engine = AsyncLLMEngine.from_engine_args(engine_args)

    with open(args.prompt_file, "r", encoding="utf-8") as f:
        prompts_data = json.load(f)

    # Select `concurrency` requests
    requests = prompts_data[:args.concurrency]

    # Warmup 1 lightweight request
    print("Running warmup request...")
    warmup_params = SamplingParams(max_tokens=4, temperature=0.0)
    async for _ in engine.generate("Hello world", warmup_params, "warmup"):
        pass
    print("Warmup finished.")

    # Start GPU monitor
    stop_monitor, gpu_stats = start_gpu_monitor(interval_sec=0.1)

    async def stream_request(req_id, prompt, max_tokens):
        sampling_params = SamplingParams(max_tokens=max_tokens, temperature=0.7)
        t0 = time.perf_counter()
        first_token_time = None
        last_token_time = None
        itls = []
        token_count = 0

        gen = engine.generate(prompt, sampling_params, req_id)
        async for out in gen:
            now = time.perf_counter()
            cur_tokens = len(out.outputs[0].token_ids)
            if cur_tokens > token_count:
                new_tokens = cur_tokens - token_count
                token_count = cur_tokens
                if first_token_time is None:
                    first_token_time = now
                else:
                    itls.append(((now - last_token_time) * 1000.0) / new_tokens)
                last_token_time = now

        finish_time = time.perf_counter()
        ttft_ms = ((first_token_time - t0) * 1000.0) if first_token_time else 0.0
        return {
            "ttft_ms": ttft_ms,
            "itls": itls,
            "token_count": token_count,
            "duration": finish_time - t0
        }

    print(f"Starting benchmark: concurrency={args.concurrency}, traffic_type={args.traffic_type}...")
    batch_start = time.perf_counter()
    tasks = [
        stream_request(f"req_{i}", req["prompt"], req["max_tokens"])
        for i, req in enumerate(requests)
    ]
    results = await asyncio.gather(*tasks)
    batch_duration = time.perf_counter() - batch_start

    stop_monitor.set()
    time.sleep(0.2)

    # Collect statistics
    all_ttfts = [r["ttft_ms"] for r in results]
    all_itls = []
    for r in results:
        all_itls.extend(r["itls"])
    total_generated_tokens = sum(r["token_count"] for r in results)

    ttft_p50 = float(np.percentile(all_ttfts, 50)) if all_ttfts else 0.0
    ttft_p99 = float(np.percentile(all_ttfts, 99)) if all_ttfts else 0.0
    itl_p99 = float(np.percentile(all_itls, 99)) if all_itls else 0.0
    throughput = float(total_generated_tokens / batch_duration) if batch_duration > 0 else 0.0

    avg_gpu_util = float(np.mean(gpu_stats["util_pct"])) if gpu_stats["util_pct"] else 0.0
    peak_gpu_mem = float(np.max(gpu_stats["mem_mib"])) if gpu_stats["mem_mib"] else 0.0

    traffic_label = "长入短出" if "rag" in args.traffic_type.lower() or "long_input" in args.traffic_type.lower() else "短入长出"

    res_record = {
        "chunk_size": chunk_size if chunk_size > 0 else "baseline",
        "traffic_type": traffic_label,
        "concurrency": args.concurrency,
        "ttft_p50_ms": round(ttft_p50, 2),
        "ttft_p99_ms": round(ttft_p99, 2),
        "itl_p99_ms": round(itl_p99, 2),
        "throughput_tokens_per_sec": round(throughput, 2),
        "gpu_compute_util_pct": round(avg_gpu_util, 1),
        "gpu_mem_used_mib": round(peak_gpu_mem, 1)
    }

    print("\nBenchmark Result:")
    print(json.dumps(res_record, indent=2, ensure_ascii=False))

    if args.output_file:
        with open(args.output_file, "w", encoding="utf-8") as f:
            json.dump(res_record, f, indent=2, ensure_ascii=False)
        print(f"Saved result to {args.output_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=str, default="/kaggle/input/models/qwen-lm/qwen2.5/transformers/7b-instruct/1")
    parser.add_argument("--tensor-parallel-size", type=int, default=0, help="Tensor parallel size (0 for auto-detect torch.cuda.device_count())")
    parser.add_argument("--chunk-size", type=int, default=0, help="0 for disabled/baseline, or 256/512/1024/2048/4096")
    parser.add_argument("--traffic-type", type=str, default="long_input_short_output")
    parser.add_argument("--concurrency", type=int, default=4)
    parser.add_argument("--prompt-file", type=str, required=True)
    parser.add_argument("--output-file", type=str, default="")
    args = parser.parse_args()

    asyncio.run(run_benchmark(args))
