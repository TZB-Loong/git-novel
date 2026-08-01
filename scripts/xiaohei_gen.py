#!/usr/bin/env python3
"""Generate ian-xiaohei style illustrations via new-api Z-Image-Turbo.
Directly calls the images API (SiliconFlow format: {"images":[{"url":...}]}),
bypassing Hermes Web UI endpoint which expects OpenAI b64_json streaming.
Usage: python3 xiaohei_gen.py "prompt" /output/path.png [width] [height]
"""
import json, os, subprocess, sys, urllib.request

def get_key():
    cfg = os.path.expanduser("~/.hermes/profiles/li/config.yaml")
    with open(cfg) as f:
        for line in f:
            if "api_key" in line and "new-api" not in line:
                # find the new-api-image block's key - simpler: read new-api block
                pass
    # Simpler: read raw yaml and extract new-api key
    with open(cfg) as f:
        content = f.read()
    import re
    m = re.search(r'name: "new-api"\n\s+base_url: "([^"]+)"\n\s+api_key: "([^"]+)"', content)
    if not m:
        sys.exit("ERROR: new-api provider not found")
    return m.group(1), m.group(2)

BASE_URL, API_KEY = get_key()
MODEL = "Tongyi-MAI/Z-Image-Turbo"

def gen(prompt, out_path, w=1536, h=1024):
    body = json.dumps({
        "model": MODEL,
        "prompt": prompt,
        "n": 1,
        "size": f"{w}x{h}",
    }).encode()
    req = urllib.request.Request(f"{BASE_URL}/images/generations", data=body,
        headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as resp:
        data = json.loads(resp.read())
    img_url = data["images"][0]["url"]
    print(f"Image URL received ({len(img_url)} chars)")
    # Download
    os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
    with urllib.request.urlopen(img_url, timeout=120) as img_resp:
        with open(out_path, "wb") as f:
            f.write(img_resp.read())
    print(f"Saved: {out_path} ({os.path.getsize(out_path)} bytes)")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 3:
        sys.exit("Usage: xiaohei_gen.py \"prompt\" /out.png [w] [h]")
    prompt = sys.argv[1]
    out = sys.argv[2]
    w = int(sys.argv[3]) if len(sys.argv) > 3 else 1536
    h = int(sys.argv[4]) if len(sys.argv) > 4 else 1024
    gen(prompt, out, w, h)
