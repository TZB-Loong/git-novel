---
title: Agent-as-a-Platform：构建 Claude CLI 权限透传架构
pubDate: 2026-06-26
cover: notes/claude-permission-cover.svg
tags: [AI, Agent, 架构, Claude, PTY, 自动化]
---

## 问题背景

当 Claude CLI 作为子进程运行时，它会因权限提示（"Allow this command?"）阻塞等待用户输入。在自动化平台中，用户无法直接与 CLI 交互，需要一种机制将权限提示**透传到前端**，再将用户确认**注入回子进程**。

核心思路是：把 Claude CLI 当作一个 **PTY 子进程**来管理，捕获权限提示事件，透传到前端交互，再把用户确认注入回去。

---

## 一、核心架构：PTY 子进程 + 事件捕获 + 透传

实现流程分为五个步骤：

```
前端(Web/CLI)  →  中间层(Hermes/Node)  →  Claude CLI(PTY)
     │                    │                     │
     │   发送任务          │                     │
     ├──────────────────► │                     │
     │                    │   spawn PTY 进程     │
     │                    ├────────────────────►│
     │                    │   "Allow command?"   │
     │                    │◄────────────────────┤
     │  转发权限提示       │                     │
     │◄───────────────────┤                     │
     │  用户点击允许       │                     │
     ├──────────────────► │                     │
     │                    │  注入 "Y\n"         │
     │                    ├────────────────────►│
     │                    │  继续执行...         │
     │                    │◄────────────────────┤
```

---

## 二、方案详解

### 方案一：PTY 模式 + 输出解析

最灵活的方式。运行 Claude CLI 的 PTY 子进程，实时解析 stdout，检测到权限提示时挂起等待前端确认。

**权限提示的典型格式：**

```
Allow this tool to read .env?
  → Y (yes) / N (no) / A (always allow) / D (deny always) / S (show details)

Allow this command to run?
  Bash(cat .env)
  → Y (yes) / ...
```

**核心逻辑（约 80 行）：**

```python
import pty, os, select, re

PERMISSION_PATTERNS = [
    rb"Allow this (tool|command|Bash|Read|Edit|WebFetch).*\?\s*",
    rb"→ Y \(yes\) / N \(no\) / A \(always allow\) / D \(deny always\)",
]

def run_claude_with_relay(frontend_send, frontend_recv):
    master, slave = pty.openpty()
    proc = subprocess.Popen(["claude", "-p", "任务"],
                            stdin=slave, stdout=slave, stderr=slave)
    os.close(slave)

    buffer = b""
    while proc.poll() is None:
        r, _, _ = select.select([master], [], [], 0.1)
        if r:
            data = os.read(master, 65536)
            buffer += data
            frontend_send(data.decode(errors='replace'))

            for pattern in PERMISSION_PATTERNS:
                if re.search(pattern, buffer, re.DOTALL):
                    response = frontend_recv(timeout=60)
                    decision = "Y" if response.get("allow") else "N"
                    os.write(master, f"{decision}\n".encode())
                    buffer = b""
                    break
```

### 方案二：Hermes Agent 的 PTY + process 工具

Hermes Agent 的 `terminal(pty=True)` 原生支持 PTY 模式，配合 `process(action='write'/'submit')` 可以向子进程注入输入。

```bash
# 后台启动 Claude CLI (PTY 模式)
terminal(command="claude --permission-mode acceptEdits",
         background=true, pty=true, notify_on_complete=true)

# 看到权限提示后，注入确认
process(action="submit", data="Y")

# 也可以直接发送整段输入
process(action="write", data="这个权限可以允许\n")
```

### 方案三：前端调度器模式（完整方案）

最完善的架构，适合需要嵌入 Web UI 的场景：

```
┌──────────────────────────────────────────────┐
│                前端 (Web UI)                    │
│  [任务输入] [权限审批面板] [执行日志]             │
│  [确认/拒绝按钮]                                │
└─────────────────────┬────────────────────────┘
                      │ WebSocket / SSE
┌─────────────────────▼────────────────────────┐
│           中间调度层 (Node.js/Python)           │
│                                                │
│  1. spawn PTY 子进程 (claude -p "任务")        │
│  2. 解析 stdout → 检测权限模式                  │
│  3. 检测到 → 挂起进程 → 推送到前端               │
│  4. 收到前端回复 → 注入到 stdin                 │
│  5. 继续执行 → 循环                            │
└─────────────────────┬────────────────────────┘
                      │ PTY
┌─────────────────────▼────────────────────────┐
│          Claude CLI (PTY 子进程)                │
│  ~ claude -p "部署到生产环境"                    │
│  ? Allow Bash(npm run deploy) [Y/n]            │
│  ← 等待注入...                                  │
└────────────────────────────────────────────────┘
```

#### 关键实现要点

| 组件 | 技术选型 | 说明 |
|------|---------|------|
| **PTY 创建** | Python `pty` / Node `node-pty` | 创建伪终端，捕获交互输出 |
| **输出流解析** | 正则/状态机 | 匹配 `Allow ... [Y/n]` 模式 |
| **进程挂起** | `select.poll` + 状态标志 | 检测到权限时暂停读取循环 |
| **前端通道** | WebSocket / SSE | 实时推送 stdout + 接收确认 |
| **输入注入** | `os.write(fd, "Y\n")` | 将用户选择写回 PTY stdin |
| **超时兜底** | 60s 超时自动拒绝 | 前端无响应时默认最小权限 |

### 方案四：Hermes Agent approval 机制

Hermes Agent 本身实现了审批管道：

```yaml
# ~/.hermes/config.yaml
approvals:
  mode: manual       # manual / smart / off
  timeout: 60        # 超时秒数
  platform_hint: true
```

`approvals.mode: smart` 模式下：
1. 辅助 LLM 判断命令风险等级
2. 低风险自动批准
3. 高风险 → 通过 Telegram / Web UI / Discord 推送审批提示
4. 等待用户点击确认/拒绝

---

## 三、方案对比

| 场景 | 推荐方案 | 复杂度 |
|------|---------|:------:|
| 快速用起来 | Claude `--permission-mode auto` | 低 |
| Hermes Agent 用户 | `approvals.mode: smart` + gateway | 低 |
| 自建前端透传 | PTY 子进程 + WebSocket | 中 |
| 生产级平台 | 调度器模式（方案三） | 高 |

---

## 四、总结

构建 Claude CLI 权限透传机制的核心在于：

1. **PTY 子进程** — 正确管理伪终端，捕获交互式输出
2. **输出流解析** — 用正则/状态机精确检测权限提示边界
3. **事件挂起与恢复** — 检测到权限时挂起执行流，等待外部确认
4. **输入注入** — 将用户决策写回子进程的 stdin

这套模式不仅适用于 Claude CLI，也适用于任何交互式 CLI 工具的自动化包装场景，是构建 AI Agent 平台的基础设施组件。
