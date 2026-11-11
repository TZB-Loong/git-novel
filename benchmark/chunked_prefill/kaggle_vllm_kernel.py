"""
Kaggle Notebook Execution Entrypoint for Chunked Prefill Benchmark
Run this on Kaggle GPU T4 x 1 or T4 x 2.
"""
import os
import subprocess
import sys

def setup_env():
    print("Checking dependencies...")
    try:
        import vllm
        print(f"vLLM already installed: {vllm.__version__}")
    except ImportError:
        print("Installing vllm, numpy...")
        subprocess.run([sys.executable, "-m", "pip", "install", "-q", "vllm>=0.6.0", "numpy"], check=True)

def find_model():
    candidates = [
        "/kaggle/input/models/qwen-lm/qwen2.5/transformers/7b-instruct/1",
        "/kaggle/input/qwen2.5-7b-instruct",
        "Qwen/Qwen2.5-7B-Instruct"
    ]
    for c in candidates:
        if os.path.exists(c):
            print(f"Found local model path: {c}")
            return c
    print("Using HuggingFace / ModelScope model ID: Qwen/Qwen2.5-7B-Instruct")
    return "Qwen/Qwen2.5-7B-Instruct"

if __name__ == "__main__":
    setup_env()
    model_path = find_model()

    probe_mode = "--probe" in sys.argv
    cmd = [
        sys.executable, "run_benchmark_matrix.py",
        "--model", model_path,
        "--output-json", "/kaggle/working/benchmark_chunked_prefill_results.json",
        "--output-csv", "/kaggle/working/benchmark_chunked_prefill_results.csv"
    ]
    for arg in ["--tp", "--tensor-parallel-size"]:
        if arg in sys.argv:
            idx = sys.argv.index(arg)
            cmd.extend(["--tensor-parallel-size", sys.argv[idx + 1]])
    if probe_mode:
        cmd.append("--probe")

    print(f"Executing: {' '.join(cmd)}")
    subprocess.run(cmd, check=True)
