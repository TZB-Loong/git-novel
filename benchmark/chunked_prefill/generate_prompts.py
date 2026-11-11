"""
Generate synthetic benchmark prompt sets for vLLM Chunked Prefill evaluation:
1. traffic_type = "rag_2048_64" (Long input ~2048 tokens, short output ~64 tokens)
2. traffic_type = "code_128_1024" (Short input ~128 tokens, long output ~1024 tokens)
"""
import json
import os

def build_rag_text(doc_id):
    paragraphs = [
        f"Section {doc_id}.1: Storage Engine and Log-Structured Merge Trees Architecture.\n"
        "In modern distributed data storage engines, write amplification and read amplification represent "
        "fundamental trade-offs governed by the underlying disk I/O characteristics and memory hierarchy. "
        "Log-Structured Merge-trees (LSM-trees) optimize write performance by transforming random I/O operations "
        "into sequential writes via append-only commit logs and in-memory MemTables. When a MemTable reaches its "
        "configured capacity threshold (typically 64MB or 128MB), an immutable flush operation freezes the buffer "
        "and dispatches a background task to serialize sorted string tables (SSTables) to persistent block storage. "
        "Compaction strategies such as Leveled Compaction and Size-Tiered Compaction determine how overlapping keys "
        "are deduplicated and merged across hierarchical tiers.",

        f"Section {doc_id}.2: Consensus Protocols and Multi-Raft Partitioning.\n"
        "To ensure high availability and partition tolerance across geo-distributed availability zones, the system "
        "deploys Multi-Raft state machines where discrete key-range partitions (regions) maintain independent Raft consensus "
        "groups. Each Raft leader processes write proposals through a strict two-phase commit lifecycle: replicating log "
        "entries to a majority quorum of followers, awaiting fsync confirmations, and broadcasting commit indexes. "
        "Heartbeat timers and leader lease mechanisms eliminate the overhead of read-index quorums during linearizable read "
        "evaluations, achieving sub-millisecond local read latencies under normal network conditions.",

        f"Section {doc_id}.3: Memory Management and Cache Replacement Policies.\n"
        "The cache tier integrates an adaptive 2-Queue (2Q) page cache with Direct I/O bypass buffers to isolate high-throughput "
        "batch scans from point-lookup query paths. Block caches maintain compressed 4KB disk blocks in unmanaged off-heap memory "
        "to mitigate garbage collection pauses. When memory pressure exceeds the 85% high-water mark, an asynchronous eviction daemon "
        "ranks cache blocks using frequency-weighted LRU scoring. Concurrency control utilizes optimistic lock-free skip lists "
        "with epoch-based memory reclamation to prevent dangling pointer references during dynamic resizing.",

        f"Section {doc_id}.4: Vector Indexing and Hierarchical Navigable Small World Graphs.\n"
        "For high-dimensional embedding retrieval, the search engine constructs HNSW graphs with Euclidean and cosine metric "
        "spaces. Layered graph construction bounds the maximum degree of vertex connections (M=32) while tuning the construction "
        "beam width (efConstruction=200). Pruning heuristics preserve cross-cluster connectivity while discarding redundant edges. "
        "Vector quantization techniques including Scalar Quantization (SQ8) and Product Quantization (PQ) compress 1536-dimensional "
        "floating-point embeddings down to compact byte arrays, reducing memory bandwidth pressure during exhaustive distance computations.",

        f"Section {doc_id}.5: Query Optimization and Vectorized Vector Pipeline Execution.\n"
        "The analytical execution engine operates on Apache Arrow columnar format, compiling relational query plans into vectorized "
        "SIMD kernels using LLVM JIT code generation. Hash join operators build lock-free hash tables with cache-aligned buckets, "
        "minimizing CPU L3 cache misses. Adaptive filter pushdown evaluates predicate bitmasks directly against compressed parquet "
        "dictionaries prior to record deserialization, maximizing throughput over high-bandwidth NVMe arrays."
    ]
    full_doc = "\n\n".join(paragraphs * 2)
    prompt = (
        f"[SYSTEM: You are a principal distributed systems architect. Read the technical documentation below carefully. "
        f"Answer the prompt with a concise executive summary in under 60 words.]\n\n"
        f"--- BEGIN TECHNICAL SPECIFICATION DOCUMENT #{doc_id} ---\n"
        f"{full_doc}\n"
        f"--- END TECHNICAL SPECIFICATION DOCUMENT ---\n\n"
        f"Question: Based on Section {doc_id}.1 through {doc_id}.5, summarize the primary mechanism used for mitigating "
        f"write amplification while ensuring linearizable read consistency. Keep your answer brief and direct."
    )
    return prompt

def build_code_prompt(task_id):
    prompts = [
        "Implement a thread-safe, lock-free LRU Cache in modern C++20 using atomic shared_ptr and hazard pointers. "
        "Include class definition, node eviction logic, concurrency handling, and comprehensive unit tests with edge cases.",
        "Write a complete production-grade asyncio rate limiter in Python 3.12 using the Token Bucket and Leaky Bucket algorithms. "
        "Support Redis cluster synchronization, sliding window fallback, and include full type annotations, docstrings, and tests.",
        "Implement a high-performance B-Tree index from scratch in Rust with support for concurrent search, node splitting, "
        "key borrowing, and persistent binary serialization. Provide full code with thorough unit tests and benchmark examples.",
        "Write a custom CUDA kernel in PyTorch (C++/CUDA extension) to perform chunked causal self-attention with fused softmax. "
        "Include shared memory tiling, warp shuffles, gradient backward pass, and Python binding wrapper."
    ]
    task = prompts[task_id % len(prompts)]
    prompt = (
        f"You are an expert systems engineer. Complete the following task with exhaustive code, docstrings, and comments:\n\n"
        f"Task {task_id + 1}: {task}\n\n"
        f"Requirements: Provide a complete, fully compilable/runnable implementation without placeholders or ellipses."
    )
    return prompt

def main():
    target_dir = os.path.dirname(os.path.abspath(__file__))
    
    rag_samples = []
    for i in range(32):
        rag_samples.append({
            "id": f"rag_{i:03d}",
            "prompt": build_rag_text(i + 1),
            "max_tokens": 64,
            "min_tokens": 32,
            "traffic_type": "long_input_short_output"
        })
        
    code_samples = []
    for i in range(32):
        code_samples.append({
            "id": f"code_{i:03d}",
            "prompt": build_code_prompt(i),
            "max_tokens": 1024,
            "min_tokens": 512,
            "traffic_type": "short_input_long_output"
        })

    with open(os.path.join(target_dir, "prompts_rag_2k.json"), "w", encoding="utf-8") as f:
        json.dump(rag_samples, f, indent=2, ensure_ascii=False)
        
    with open(os.path.join(target_dir, "prompts_code_128.json"), "w", encoding="utf-8") as f:
        json.dump(code_samples, f, indent=2, ensure_ascii=False)
        
    print(f"Generated {len(rag_samples)} RAG prompts to {target_dir}")
    print(f"Generated {len(code_samples)} Code prompts to {target_dir}")

if __name__ == "__main__":
    main()
