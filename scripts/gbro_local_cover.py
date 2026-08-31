#!/usr/bin/env python3
"""
GBro 封面本地落地 — 直连本地 Z-Image Omni 多图工作流
将 gbro-cover-design 产出的 3:4竖版提示词 + 人脸/素材参考图，直接喂给本地 ComfyUI 的 Z-Image_Omni_3Ref 工作流，无需云端。

用法:
  # 1. 先用 gbro 生成提示词（交互式三轮问），得到一段以"3:4 竖版构图"开头的中文提示词
  # 2. 本地渲染：
  python3 scripts/gbro_local_cover.py \
    --prompt "3:4 竖版构图。参考图1的女性五官..." \
    --ref1 /path/to/face.png \
    --ref2 /path/to/product.png \
    --output /tmp/gbro_cover.png \
    --width 768 --height 1024

  # 或从文章直接一键（自动选深色渐变风 + 标题提炼，需人工确认）：
  python3 scripts/gbro_local_cover.py --article src/content/notes/qwen38-flash-next-m4-pro-feasibility.md --ref1 assets/my-face.png

依赖: 本地 ComfyUI 127.0.0.1:8188 需运行，模型 z_image_turbo_bf16/qwen_3_4b/ae 已就位
"""
import argparse, json, os, sys, time, urllib.request, urllib.error, pathlib, random, shutil

COMFY_API = "http://127.0.0.1:8188"
COMFY_INPUT = pathlib.Path("/Users/loong/dev/comfyui/input")
# 默认工作流 API（与 Z-Image_Omni_3Ref_api.json 一致）
DEFAULT_WORKFLOW_API = pathlib.Path("/Users/loong/dev/comfyui/user/default/workflows/Z-Image_Omni_3Ref_api.json")

def ensure_comfy():
    import socket
    s=socket.socket(socket.AF_INET, socket.SOCK_STREAM); s.settimeout(1)
    try: s.connect(("127.0.0.1",8188)); s.close(); return True
    except: s.close(); return False

def load_workflow():
    if DEFAULT_WORKFLOW_API.exists():
        return json.loads(DEFAULT_WORKFLOW_API.read_text())
    # fallback 内置
    return {
        "1":{"inputs":{"unet_name":"z_image_turbo_bf16.safetensors","weight_dtype":"default"},"class_type":"UNETLoader"},
        "2":{"inputs":{"clip_name":"qwen_3_4b.safetensors","type":"qwen_image","device":"default"},"class_type":"CLIPLoader"},
        "3":{"inputs":{"vae_name":"ae.safetensors"},"class_type":"VAELoader"},
        "4":{"inputs":{"image":"example.png"},"class_type":"LoadImage"},
        "5":{"inputs":{"image":"example.png"},"class_type":"LoadImage"},
        "6":{"inputs":{"image":"example.png"},"class_type":"LoadImage"},
        "7":{"inputs":{"clip":["2",0],"prompt":"", "auto_resize_images":True,"vae":["3",0],"image1":["4",0],"image2":["5",0],"image3":["6",0]},"class_type":"TextEncodeZImageOmni"},
        "8":{"inputs":{"conditioning":["7",0]},"class_type":"ConditioningZeroOut"},
        "9":{"inputs":{"width":768,"height":1024,"batch_size":1},"class_type":"EmptyLatentImage"},
        "10":{"inputs":{"model":["1",0],"positive":["7",0],"negative":["8",0],"latent_image":["9",0],"seed":42,"steps":8,"cfg":1,"sampler_name":"euler","scheduler":"simple","denoise":1},"class_type":"KSampler"},
        "11":{"inputs":{"samples":["10",0],"vae":["3",0]},"class_type":"VAEDecode"},
        "12":{"inputs":{"images":["11",0],"filename_prefix":"gbro_cover"},"class_type":"SaveImage"},
    }

def copy_to_input(src_path):
    if not src_path: return "example.png"
    src=pathlib.Path(src_path)
    if not src.exists():
        print(f"参考图不存在: {src}, 使用 example.png")
        return "example.png"
    dst=COMFY_INPUT / src.name
    if src.resolve() != dst.resolve():
        shutil.copy(str(src), str(dst))
        print(f"已复制 {src} -> {dst}")
    return src.name

def render(prompt, ref1, ref2, ref3, out_path, w, h, seed=None):
    if seed is None: seed=random.randint(0, 2**32-1)
    wf=load_workflow()
    # 覆盖输入
    wf["4"]["inputs"]["image"]=copy_to_input(ref1) if ref1 else "example.png"
    wf["5"]["inputs"]["image"]=copy_to_input(ref2) if ref2 else "example.png"
    wf["6"]["inputs"]["image"]=copy_to_input(ref3) if ref3 else "example.png"
    wf["7"]["inputs"]["prompt"]=prompt
    wf["9"]["inputs"]["width"]=w
    wf["9"]["inputs"]["height"]=h
    wf["10"]["inputs"]["seed"]=seed
    # 提交
    if not ensure_comfy():
        print("ComfyUI 未运行，请先启动: python main.py --listen 0.0.0.0 --port 8188")
        sys.exit(1)
    data=json.dumps({"prompt":wf}).encode()
    req=urllib.request.Request(f"{COMFY_API}/prompt", data=data, headers={"Content-Type":"application/json"})
    with urllib.request.urlopen(req, timeout=10) as r:
        pid=json.loads(r.read())["prompt_id"]
        print(f"已提交 prompt_id={pid} seed={seed} {w}x{h}")
        # 将 pid 写入临时文件供轮询
        pathlib.Path("/tmp/gbro_last_pid.txt").write_text(pid)
        print(f"PID 已写入 /tmp/gbro_last_pid.txt，可用 curl 轮询: curl http://127.0.0.1:8188/history/{pid}")
    # 是否仅提交
    if globals().get("NO_WAIT", False):
        print("已仅提交，不等待（ComfyUI 后台 53s 生成中）")
        return True
    # 轮询
    for i in range(90):
        time.sleep(1)
        with urllib.request.urlopen(f"{COMFY_API}/history/{pid}", timeout=5) as hr:
            hist=json.loads(hr.read())
            if pid in hist and hist[pid].get("status",{}).get("completed"):
                outs=hist[pid].get("outputs",{})
                for nid, out in outs.items():
                    if "images" in out:
                        im=out["images"][0]
                        url=f"{COMFY_API}/view?filename={im['filename']}&subfolder={im.get('subfolder','')}&type={im.get('type','output')}"
                        print(f"完成 {im['filename']} 下载 {url}")
                        os.makedirs(os.path.dirname(os.path.abspath(out_path)), exist_ok=True)
                        with urllib.request.urlopen(url, timeout=20) as ir:
                            open(out_path,"wb").write(ir.read())
                        print(f"已保存 {out_path} ({os.path.getsize(out_path)} bytes) via 本地 Z-Image Omni 3Ref")
                        return True
        if i%5==0: print(f"等待 {i}s...")
    print("超时")
    return False

def auto_prompt_from_article(article_path):
    """简易版：读文章，提炼标题，选深色渐变风，拼出 gbro 风格提示词（完整版请走 gbro skill 三轮问）"""
    text=pathlib.Path(article_path).read_text()
    title=text.splitlines()[0][:12] if text else "AI 封面"
    # 取 frontmatter title
    import re
    m=re.search(r'title:\s*(.+)', text)
    if m: title=m.group(1).strip()[:8]
    # 默认深色渐变风模板
    template = f"""3:4 竖版构图。

参考图1的女性五官特征，保持五官一致性，只要半身。

自信得意表情，嘴角微扬眼神笃定，人物居中，占比约35%，双手自然下垂，

巨大的中文大字"{title}"覆盖在人物背后，超粗白色黑体，白色到橙红渐变，被人物部分遮挡，

背景：深色渐变藏青到暗红，柔和过渡

所有关键元素集中在中间区域，距画面四边至少保留约10%边距，悬浮元素轻微投影，高饱和度，又整齐又凌乱的美感"""
    return template

if __name__=="__main__":
    ap=argparse.ArgumentParser(description="GBro 本地落地 - Z-Image Omni")
    ap.add_argument("--prompt", help="gbro 产出的 3:4 竖版提示词（以 3:4 竖版构图开头）")
    ap.add_argument("--article", help="或直接给文章路径，自动拼提示词（简易）")
    ap.add_argument("--ref1", help="参考图1 人脸")
    ap.add_argument("--ref2", help="参考图2 产品/素材")
    ap.add_argument("--ref3", help="参考图3 场景")
    ap.add_argument("--output", default="/tmp/gbro_cover.png", help="输出路径")
    ap.add_argument("--width", type=int, default=768, help="宽，3:4建议768")
    ap.add_argument("--height", type=int, default=1024, help="高，3:4建议1024")
    ap.add_argument("--seed", type=int, default=None)
    ap.add_argument("--no-wait", action="store_true", help="仅提交不等待（沙盒内避免超时）")
    args=ap.parse_args()
    prompt=args.prompt
    if not prompt and args.article:
        prompt=auto_prompt_from_article(args.article)
        print("自动生成提示词:\n", prompt)
    if not prompt:
        ap.print_help(); sys.exit(1)
    # 若无 ref1，尝试使用 gbro 默认人脸
    if not args.ref1:
        default_face=pathlib.Path("/Users/loong/.codex/skills/gbro-cover-design/assets/my-face.png")
        if default_face.exists():
            args.ref1=str(default_face)
        else:
            # 使用示例图
            args.ref1=None
            print("未提供 ref1 且无默认人脸，将用 example.png（无保脸，仅演示构图）")
    global NO_WAIT; NO_WAIT=args.no_wait
    ok=render(prompt, args.ref1, args.ref2, args.ref3, args.output, args.width, args.height, args.seed)
    sys.exit(0 if ok else 1)
