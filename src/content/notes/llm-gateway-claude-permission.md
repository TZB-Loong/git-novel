---
title: LLM 网关 + Claude CLI 子进程权限拦截方案
pubDate: 2026-06-26
cover: notes/claude-permission-cover.svg
tags: [AI, Agent, 架构, Claude, ACP, 权限]
---

# LLM 网关 + Claude CLI 子进程权限拦截方案

全新自定义 Agent 架构，**不使用 Hermes Agent 的任何组件**。LLM 网关作为主控智能层，通过 ACP 协议控制 Claude CLI 子进程。

## 架构图

```
┌───────────────────────────────────────────────────────────────┐
│                       用户前端                                  │
│  发送任务 + 接收实时输出 + 处理权限提示                        │
└─────────┬──────────────────────────────┬──────────────────────┘
          │                              │
          │ 任务请求/流式响应             │ 权限请求/用户决策
          ▼                              ▼
┌───────────────────────────────────────────────────────────────┐
│                    LLM 网关 (自定义 Agent)                      │
│  ● 主控 LLM — 理解用户意图、拆解任务、决策调度                 │
│  ● 管理会话上下文、记忆、工具调用                               │
│  ● 决定何时将任务委托给 Claude CLI                             │
│  ● 接收权限请求 → 判断自动放行 → 或转发用户                    │
│  ● 汇总结果、解释输出                                           │
└──────────────────────┬────────────────────────────────────────┘
          │                           ▲
          │ 启动/停止子进程            │ 结构化 JSON-RPC
          │ 发送 prompt                │ session/request_permission
          │ 接收流式 update            │ fs/read_text_file 等
          ▼                           │
┌───────────────────────────────────────────────────────────────┐
│              ACP Proxy Layer（权限拦截桥）                       │
│  纯自建 / 无 Hermes 依赖                                        │
│  ① 通过 ACP 协议启动 Claude CLI 为子进程                       │
│  ② 接收 session/request_permission → 转发给 LLM 网关           │
│  ③ 接收 LLM 网关的决策 → 构建 ACP response → 注入回 Claude    │
│  ④ session-scoped 权限缓存（allow for session）                │
│  ⑤ 超时默认 deny（fail closed）                                │
│  ⑥ 可选文件系统代理（fs/read, fs/write）                       │
└──────────────────────┬────────────────────────────────────────┘
          │                           ▲
          │ stdin/stdout               │ JSON-RPC
          │ ACP 协议 v1                │
          ▼                           │
┌───────────────────────────────────────────────────────────────┐
│              Claude CLI (实际任务执行层)                        │
│  通过 `claude --acp --stdio` 启动 ACP 模式                     │
│  执行编码、Shell、文件操作                                      │
│  需要权限时发送 session/request_permission                     │
└───────────────────────────────────────────────────────────────┘
```

## 方案一：自定义 ACP Proxy（推荐）

核心思路：自己写一个轻量级的 ACP Proxy 程序（Python 或 Node.js），作为 LLM 网关和 Claude CLI 之间的桥梁。不依赖 Hermes、不依赖任何 Agent 框架。

### 代码实现

```python
"""
acp_proxy_bridge.py
轻量级 ACP Proxy：启动 Claude CLI 为 ACP 子进程，
拦截权限请求，转发给 LLM 网关。
零 Hermes 依赖，纯 Python + agent-client-protocol SDK。
"""

import asyncio
import json
import uuid
import os
import subprocess
from dataclasses import dataclass, field
from typing import Optional, Callable, Awaitable
from pathlib import Path


# ──────────────────────────────────────────
# 数据结构
# ──────────────────────────────────────────

@dataclass
class PermissionRequest:
    session_id: str
    tool_call_id: str
    title: str
    kind: str                # execute | read | edit | delete | fetch | other
    raw_input: Optional[dict]
    options: list[dict]      # [{optionId, name, kind}, ...]


@dataclass
class PermissionResponse:
    outcome: str             # "selected" | "cancelled"
    option_id: Optional[str] = None


@dataclass
class SessionScopeCache:
    """Session 级权限缓存"""
    allow_set: set[str] = field(default_factory=set)


# ──────────────────────────────────────────
# ACP Proxy Bridge
# ──────────────────────────────────────────

class ACPProxyBridge:
    """
    Claude CLI <-> LLM 网关之间的 ACP 协议桥。
    职责：
    - 启动 Claude CLI（ACP 模式）
    - 处理 ACP JSON-RPC 消息
    - 拦截 session/request_permission → 回调 LLM 网关
    - 注入用户决策回 Claude CLI
    - fail closed：超时/异常时自动 deny
    """
    
    def __init__(self,
                 gateway_permission_callback: Callable[
                     [PermissionRequest], Awaitable[PermissionResponse]
                 ],
                 claude_command: str = "claude",
                 workdir: str = "."):
        self._callback = gateway_permission_callback
        self._claude_cmd = claude_command
        self._workdir = workdir
        self._process: Optional[asyncio.subprocess.Process] = None
        self._session_cache = SessionScopeCache()
        self._persistent_allowlist: set[str] = set()
        self._load_persistent_allowlist()
        self._pending_requests: dict[int, asyncio.Future] = {}
        self._session_id: Optional[str] = None

    async def start(self):
        self._process = await asyncio.create_subprocess_exec(
            self._claude_cmd, "--acp", "--stdio",
            stdin=subprocess.PIPE, stdout=subprocess.PIPE,
            stderr=subprocess.PIPE, cwd=self._workdir,
        )
        asyncio.create_task(self._read_stderr())
        asyncio.create_task(self._read_stdout())
        await self._initialize()
        await self._create_session()

    async def _initialize(self):
        result = await self._send_request("initialize", {
            "protocolVersion": 1,
            "clientCapabilities": {
                "fs": {"readTextFile": True, "writeTextFile": True},
                "terminal": True,
            },
            "clientInfo": {
                "name": "llm-gateway-acp-proxy",
                "title": "LLM Gateway ACP Proxy",
                "version": "1.0.0",
            },
        })
        print(f"[ACP] initialized, agent: {result.get('agentInfo', {})}")

    async def _create_session(self):
        result = await self._send_request("session/new", {
            "workingDirectory": os.path.abspath(self._workdir),
        })
        self._session_id = result.get("sessionId")
        print(f"[ACP] session created: {self._session_id}")

    async def send_prompt(self, text: str):
        await self._send_request("session/prompt", {
            "sessionId": self._session_id,
            "prompt": [{"type": "text", "text": text}],
        })

    async def _read_stdout(self):
        buffer = ""
        while True:
            chunk = await self._process.stdout.read(4096)
            if not chunk:
                break
            buffer += chunk.decode("utf-8")
            while "\n" in buffer:
                line, buffer = buffer.split("\n", 1)
                line = line.strip()
                if not line:
                    continue
                try:
                    msg = json.loads(line)
                except json.JSONDecodeError:
                    continue
                await self._handle_acp_message(msg)

    async def _handle_acp_message(self, msg: dict):
        if "id" in msg:
            if "result" in msg:
                future = self._pending_requests.pop(msg["id"], None)
                if future and not future.done():
                    future.set_result(msg["result"])
                return
            if "error" in msg:
                future = self._pending_requests.pop(msg["id"], None)
                if future and not future.done():
                    future.set_exception(RuntimeError(msg["error"]))
                return

        method = msg.get("method")
        if method == "session/update":
            await self._handle_session_update(msg)
        elif method == "session/request_permission":
            await self._handle_permission_request(msg)
        else:
            print(f"[ACP] unhandled method: {method}")
            await self._send_response(msg["id"], {
                "error": {"code": -32601, "message": "Method not supported"}
            })

    async def _handle_permission_request(self, msg: dict):
        params = msg.get("params", {})
        tool_call = params.get("toolCall", {})
        cache_key = self._make_cache_key(tool_call)

        if cache_key in self._session_cache.allow_set:
            await self._auto_allow(msg)
            return
        if cache_key in self._persistent_allowlist:
            await self._auto_allow(msg)
            return

        req = PermissionRequest(
            session_id=params.get("sessionId", ""),
            tool_call_id=tool_call.get("toolCallId", ""),
            title=tool_call.get("title", ""),
            kind=tool_call.get("kind", "other"),
            raw_input=tool_call.get("rawInput"),
            options=params.get("options", []),
        )

        try:
            resp = await asyncio.wait_for(self._callback(req), timeout=300.0)
        except (asyncio.TimeoutError, Exception):
            await self._deny(msg)
            return

        if resp.outcome == "cancelled":
            await self._deny(msg)
        else:
            if resp.option_id == "allow_session":
                self._session_cache.allow_set.add(cache_key)
            elif resp.option_id == "allow_always":
                self._persistent_allowlist.add(cache_key)
                self._save_persistent_allowlist()
            await self._approve(msg, resp.option_id)

    async def _auto_allow(self, msg: dict):
        await self._send_response(msg["id"], {
            "result": {"outcome": {"outcome": "selected", "optionId": "allow-once"}}
        })

    async def _approve(self, msg: dict, option_id: str):
        await self._send_response(msg["id"], {
            "result": {"outcome": {"outcome": "selected", "optionId": option_id}}
        })

    async def _deny(self, msg: dict):
        await self._send_response(msg["id"], {
            "result": {"outcome": {"outcome": "cancelled"}}
        })

    async def _handle_session_update(self, msg: dict):
        update = msg.get("params", {}).get("update", {})
        print(f"[ACP] update: {update.get('sessionUpdate')}")

    _request_counter = 0

    async def _send_request(self, method: str, params: dict) -> dict:
        self._request_counter += 1
        req_id = self._request_counter
        future = asyncio.get_event_loop().create_future()
        self._pending_requests[req_id] = future
        payload = json.dumps({
            "jsonrpc": "2.0", "id": req_id,
            "method": method, "params": params,
        }) + "\n"
        self._process.stdin.write(payload.encode())
        await self._process.stdin.drain()
        return await future

    async def _send_response(self, req_id: int, response: dict):
        payload = json.dumps({
            "jsonrpc": "2.0", "id": req_id, **response
        }) + "\n"
        self._process.stdin.write(payload.encode())
        await self._process.stdin.drain()

    def _make_cache_key(self, tool_call: dict) -> str:
        raw = tool_call.get("rawInput") or {}
        command = raw.get("command") or raw.get("path") or ""
        return f"{tool_call.get('kind', 'other')}:{command[:200]}"

    def _load_persistent_allowlist(self):
        path = Path.home() / ".llm-gateway" / "acp_allowlist.json"
        if path.exists():
            self._persistent_allowlist = set(json.loads(path.read_text()))

    def _save_persistent_allowlist(self):
        path = Path.home() / ".llm-gateway" / "acp_allowlist.json"
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text(json.dumps(list(self._persistent_allowlist), indent=2))

    async def _read_stderr(self):
        while True:
            line = await self._process.stderr.readline()
            if not line:
                break
            print(f"[Claude stderr] {line.decode().strip()}")

    async def close(self):
        if self._process:
            self._process.terminate()
            await self._process.wait()
```

### LLM 网关集成

```python
"""
llm_gateway.py
LLM 网关：核心智能调度层。全新编写，不依赖 Hermes Agent。
"""

import asyncio
import json
from acp_proxy_bridge import ACPProxyBridge, PermissionRequest, PermissionResponse


class LLMGateway:
    def __init__(self, frontend_conn, llm_provider):
        self.frontend = frontend_conn
        self.llm = llm_provider
        self.acp = ACPProxyBridge(
            gateway_permission_callback=self._on_permission_request,
            claude_command="claude",
            workdir="/path/to/project",
        )

    async def start(self):
        await self.acp.start()
        await self._main_loop()

    async def _main_loop(self):
        while True:
            user_msg = await self.frontend.receive()
            plan = await self.llm.plan(user_msg)
            if plan.action == "delegate_to_claude":
                await self.acp.send_prompt(plan.prompt_for_claude)
            summary = await self.llm.summarize(plan.result)
            await self.frontend.send(summary)

    async def _on_permission_request(self, req: PermissionRequest) -> PermissionResponse:
        auto_allowed = await self._try_auto_approve(req)
        if auto_allowed is not None:
            return auto_allowed

        permission_id = self._generate_id()
        await self.frontend.send({
            "type": "permission_request",
            "permission_id": permission_id,
            "title": req.title,
            "kind": req.kind,
            "command": str(req.raw_input or {}),
            "options": [
                {"id": o["optionId"], "label": o["name"], "kind": o["kind"]}
                for o in req.options
            ],
        })

        user_decision = await self.frontend.wait_for_response(permission_id, timeout=300)
        if user_decision is None:
            return PermissionResponse(outcome="cancelled")
        return PermissionResponse(outcome="selected", option_id=user_decision["option_id"])

    async def _try_auto_approve(self, req: PermissionRequest) -> Optional[PermissionResponse]:
        if req.kind in ("read", "search", "think"):
            return PermissionResponse(outcome="selected", option_id="allow-once")
        return None
```

## 方案二：`--permission-prompt-tool`（最简单）

利用 Claude CLI 原生支持的 `--permission-prompt-tool` 标志，把权限决策委托给一个 MCP 服务器。

```bash
claude -p "你的任务" \
  --permission-prompt-tool my-permission-server \
  --mcp-config ./mcp-config.json
```

### MCP Permission Server

```python
"""
mcp_permission_server.py
轻量级 MCP 服务器，处理权限决策。LLM 网关控制这个服务器。
"""

from mcp.server import Server
from mcp.server.models import InitializationOptions
import mcp.server.stdio
import mcp.types as types
import json

async def main():
    server = Server("permission-gate")

    @server.list_tools()
    async def handle_list_tools() -> list[types.Tool]:
        return [
            types.Tool(
                name="allow_command",
                description="允许或拒绝 Claude CLI 的命令执行请求",
                inputSchema={
                    "type": "object",
                    "properties": {
                        "permission_id": {"type": "string"},
                        "decision": {
                            "type": "string", "enum": ["allow", "deny"],
                        },
                        "scope": {
                            "type": "string", "enum": ["once", "session", "always"],
                        },
                    },
                    "required": ["permission_id", "decision"],
                },
            )
        ]

    @server.call_tool()
    async def handle_call_tool(name: str, arguments: dict) -> list[types.TextContent]:
        if name == "allow_command":
            return [types.TextContent(
                type="text",
                text=json.dumps({
                    "allowed": arguments["decision"] == "allow",
                    "scope": arguments.get("scope", "once"),
                }),
            )]
        raise ValueError(f"Unknown tool: {name}")

    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(read_stream, write_stream,
            InitializationOptions(
                server_name="permission-gate",
                server_version="1.0.0",
            ),
        )
```

## 方案三：PTY 文本拦截（备选，不推荐）

Claude CLI 不支持 ACP 模式时的备选方案。文本解析较脆弱。

```python
import asyncio
import re

class ClaudeCLI_PTY_Bridge:
    PERMISSION_PATTERN = re.compile(r"Allow\? \[(y)es.*?\]")

    async def run_claude_with_interception(self, prompt: str):
        proc = await asyncio.create_subprocess_exec(
            "claude", "-p", prompt,
            stdin=asyncio.subprocess.PIPE,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        output_buffer = ""
        while True:
            chunk = await proc.stdout.read(1024)
            if not chunk:
                break
            output_buffer += chunk.decode()
            if self.PERMISSION_PATTERN.search(output_buffer):
                # 解析文本，提取命令上下文，转发给 LLM 网关 → 用户
                pass
        return output_buffer
```

## 方案对比

| | **ACP Proxy** | **--permission-prompt-tool** | **PTY 拦截** |
|--|--|--|--|
| 依赖 | `agent-client-protocol` SDK | MCP 协议 | 无 |
| 可靠性 | ✅ 结构化 JSON-RPC | ✅ 结构化 MCP | ❌ 文本解析 |
| 实现量 | ~250 行 Python | ~50 行 MCP Server | ~80 行 |
| 权限选项 | ✅ allow_once/session/always | ✅ 通过 scope 参数 | ⚠️ 有限 |
| fail closed | ✅ 超时自动 deny | ✅ 默认 deny | ❌ 难保证 |
| Claude CLI 支持 | `--acp --stdio` | `--permission-prompt-tool`（v2.1+） | 任意版本 |
| 可控程度 | 最高 | 中等 | 低 |

### 推荐

| 场景 | 方案 |
|------|------|
| Claude CLI 支持 `--acp` | ACP Proxy |
| 支持 `--permission-prompt-tool`（v2.1+） | MCP Permission Server |
| 最快 POC | MCP Server（~50 行） |
| 最大控制权 | ACP Proxy |

## 关键设计点

### 权限请求异步挂起

权限请求应设计为异步挂起模式，不阻塞整个 LLM 网关：

```
LLM Gateway:
  ├─ Session A → Claude CLI → 权限请求 → 挂起等待用户
  ├─ Session B → Claude CLI → 正常执行
  └─ Session C → 直接 LLM 回答
```

### 与主控 LLM 的协作

```
用户请求 → 主控 LLM 规划
  → 委托 Claude CLI（ACP Proxy）
  → 权限请求 → 主控 LLM 快速评估（可选自动放行）
  → 高风险/不确定 → 前端用户
  → 用户决策 → ACP Proxy → Claude CLI
  → 结果 → 主控 LLM 汇总 → 回复用户
```

### 前端通信协议

推送：

```json
{
  "type": "permission_request",
  "id": "perm_abc123",
  "session_id": "sess_001",
  "command": "rm -rf ./build",
  "kind": "delete",
  "title": "Delete build directory",
  "context": "重构项目，清理旧的构建产物",
  "created_at": "2026-06-26T10:30:00Z"
}
```

用户返回：

```json
{
  "type": "permission_response",
  "id": "perm_abc123",
  "decision": "allow",
  "scope": "once"
}
```

## 总结

| 层次 | 组件 | 实现 |
|------|------|------|
| 智能层 | LLM 网关 | 自研，主控 LLM + 任务调度 + 权限路由 |
| 桥接层 | ACP Proxy / MCP Permission Server | 自编 50~250 行代码 |
| 执行层 | Claude CLI | 原生 ACP 模式，零改造 |
| 交互层 | 用户前端 | WebSocket + 权限弹窗 |

三种方案中，ACP Proxy 可控性最高；`--permission-prompt-tool` 最快见效。两者都不依赖 Hermes Agent。
