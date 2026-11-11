import argparse
import csv
import json
import os
import sys
import subprocess
import time

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", type=str, default="/kaggle/input/models/qwen-lm/qwen2.5/transformers/7b-instruct/1")
    parser.add_argument("--tensor-parallel-size", type=int, default=0, help="Tensor parallel size (0 for auto-detect)")
    parser.add_argument("--probe", action="store_true", help="Run 1 minimal probe to verify environment and format")
    parser.add_argument("--output-json", type=str, default="benchmark_chunked_prefill_results.json")
    parser.add_argument("--output-csv", type=str, default="benchmark_chunked_prefill_results.csv")
    args = parser.parse_args()

    work_dir = os.path.dirname(os.path.abspath(__file__))
    rag_prompts = os.path.join(work_dir, "prompts_rag_2k.json")
    code_prompts = os.path.join(work_dir, "prompts_code_128.json")
    worker_script = os.path.join(work_dir, "benchmark_worker.py")
    tmp_dir = os.path.join(work_dir, "tmp_runs")
    os.makedirs(tmp_dir, exist_ok=True)

    if args.probe:
        print("=== RUNNING MINIMAL PROBE (1 CONFIGURATION) ===")
        matrix = [
            {"chunk_size": 512, "traffic_type": "long_input_short_output", "concurrency": 4, "prompt_file": rag_prompts}
        ]
    else:
        print("=== RUNNING FULL BENCHMARK MATRIX ===")
        # 6 chunk sizes: 0 (baseline), 256, 512, 1024, 2048, 4096
        chunk_sizes = [0, 256, 512, 1024, 2048, 4096]
        traffics = [
            ("long_input_short_output", rag_prompts),
            ("short_input_long_output", code_prompts)
        ]
        concurrencies = [4, 8, 16]

        matrix = []
        for c in chunk_sizes:
            for t_name, p_file in traffics:
                for conc in concurrencies:
                    matrix.append({
                        "chunk_size": c,
                        "traffic_type": t_name,
                        "concurrency": conc,
                        "prompt_file": p_file
                    })

    all_results = []
    print(f"Total test cases to execute: {len(matrix)}")

    for idx, item in enumerate(matrix):
        c_size = item["chunk_size"]
        t_type = item["traffic_type"]
        conc = item["concurrency"]
        run_out = os.path.join(tmp_dir, f"run_{idx:03d}_{c_size}_{t_type[:4]}_{conc}.json")

        cmd = [
            sys.executable, worker_script,
            "--model", args.model,
            "--tensor-parallel-size", str(args.tensor_parallel_size),
            "--chunk-size", str(c_size),
            "--traffic-type", t_type,
            "--concurrency", str(conc),
            "--prompt-file", item["prompt_file"],
            "--output-file", run_out
        ]

        print(f"\n[{idx+1}/{len(matrix)}] Executing: chunk={c_size}, traffic={t_type}, conc={conc}")
        res = subprocess.run(cmd)
        if res.returncode != 0:
            print(f"ERROR: Run {idx+1} failed with return code {res.returncode}")
            continue

        if os.path.exists(run_out):
            with open(run_out, "r", encoding="utf-8") as f:
                record = json.load(f)
                all_results.append(record)

    # Save aggregated JSON
    with open(args.output_json, "w", encoding="utf-8") as f:
        json.dump(all_results, f, indent=2, ensure_ascii=False)
    print(f"\n[DONE] Saved aggregated JSON: {args.output_json} ({len(all_results)} records)")

    # Save aggregated CSV
    if all_results:
        fields = [
            "chunk_size", "traffic_type", "concurrency",
            "ttft_p50_ms", "ttft_p99_ms", "itl_p99_ms",
            "throughput_tokens_per_sec", "gpu_compute_util_pct", "gpu_mem_used_mib"
        ]
        with open(args.output_csv, "w", encoding="utf-8", newline="") as f:
            writer = csv.DictWriter(f, fieldnames=fields)
            writer.writeheader()
            for row in all_results:
                writer.writerow(row)
        print(f"[DONE] Saved aggregated CSV: {args.output_csv}")

if __name__ == "__main__":
    main()
