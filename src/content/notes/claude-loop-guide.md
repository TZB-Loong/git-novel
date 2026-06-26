# Claude Code `/loop` 完整指南

> 基于官方文档与实测整理 · 2026-06

---

## 一、什么是 `/loop`

`/loop` 是 Claude Code 内置的一个**会话级定时调度命令**（bundled skill）。它让 Claude 在终端会话保持打开的状态下，按照指定的时间间隔自动重复执行一个 prompt。

```bash
/loop [间隔] [要执行的 prompt]
```

### 三种调用形式

| 你提供的参数 | 示例 | 行为 |
|-------------|------|------|
| 间隔 + prompt | `/loop 5m check deploy` | 按固定间隔重复你的 prompt |
| 仅 prompt（无间隔） | `/loop check deploy` | **动态间隔**——Claude 每次迭代后自动选择等待时间（1 分钟 ~ 1 小时） |
| 仅间隔 / 无参数 | `/loop` 或 `/loop 15m` | 执行**内置维护 prompt**（或 `.claude/loop.md` 中的自定义内容） |

### 底层机制

- `/loop` 本质是一个**会话级定时器**（session-scoped cron）
- 每次迭代 = Claude 执行一次完整的 prompt → 工具调用 → 响应流程
- 迭代之间保持会话上下文（但上下文会膨胀，需关注 token 消耗）
- loop 绑定 Claude Code 进程生命周期——进程退出则 loop 停止
- 7 天自动过期：定期任务创建后 7 天自动终止
- 一个会话最多同时存在 50 个定时任务

---

## 二、`/loop` 的出现是为了解决什么

### 2.1 痛点：重复的手动操作

在 `/loop` 出现之前，以下场景需要开发者反复手动执行：

- 每 5 分钟看一眼 CI 红了没有
- 每小时检查 PR review 有没有新评论
- 每天早晨汇总前一天的 commit
- 持续监控测试覆盖率变化
- 不断轮询部署状态

这些任务的共性是：**确定性的、周期性的、不需要人类实时决策的**。手动做浪费时间，不做又不放心。

### 2.2 现有方案的问题

| 方案 | 问题 |
|------|------|
| 系统 cron + `claude -p` | 需要管理认证状态、日志、错误处理、环境变量——脆弱 |
| Shell 死循环 | 没有智能决策，每次跑一样的东西 |
| CI 定时触发 | 只能做 CI 能做的事，不能做代码推理层面的判断 |
| 第三方调度 | 额外维护成本，与开发环境割裂 |

### 2.3 `/loop` 的定位

`/loop` 填补的是 **"有人值守的长期任务自动推进"** 这个空隙：

```
系统 cron                                Claude Code /loop
  │                                          │
  │ 机器级、无人值守                          │ 会话级、有上下文
  │ 固定脚本                                  │ 智能决策（每次迭代可不同）
  │ 无 AI 推理                                │ 有 AI 理解（读代码、读 CI 日志）
  │ 脱离终端                                 │ 绑定终端（tmux 可保活）
  │                                          │
  └──────────── 配合使用 ────────────────────┘
```

它不是系统 cron 的替代品，而是**在你有 AI 推理能力时，在会话层面做自动化任务推进**的方案。

---

## 三、怎么使用 `/loop`

### 3.1 基本语法

```bash
# 固定间隔（间隔在前）
/loop 5m check if the deployment finished

# 固定间隔（间隔在后，自然语言）
/loop check the CI pipeline every 2 hours

# 支持单位
/loop 30s  check health      # 秒（向上取整到分钟）
/loop 5m   run tests          # 分钟
/loop 1h   roll logs          # 小时
/loop 6h   full audit         # 小时
/loop 1d   weekly summary     # 天
```

### 3.2 三种运行模式

#### 模式 A：固定间隔

```bash
/loop 5m check if the deployment finished and tell me what happened
```

Claude 将间隔转换为 cron 表达式，按固定节奏执行。适合需要持续轮询的场景。

#### 模式 B：动态自选间隔

```bash
/loop check whether CI passed and address any review comments
```

不指定间隔时，Claude 在每次迭代后自行判断等待多久：
- 构建快完成 / PR 活跃 → 短等待（1-5 分钟）
- 一切平静 → 长等待（可达 1 小时）
- 任务完成 → 自动结束 loop

动态间隔模式下 Claude 可能会直接使用 Monitor 工具（后台脚本 + 流式输出），比轮询更高效。

#### 模式 C：内置维护 prompt

```bash
# 纯 /loop ——自动维护模式
/loop
```

每次迭代中 Claude 按顺序执行：
1. 继续会话中未完成的任何工作
2. 照看当前分支的 PR（审查评论、失败 CI、合并冲突）
3. 无事可做时运行清理（bug 排查、代码简化）

破坏性操作（push、delete）只在会话已授权的前提下执行。

### 3.3 `.claude/loop.md`：自定义默认行为

用 `loop.md` 替换内置维护 prompt，定义你想要的自动化规则。

**文件位置（优先级从上到下）：**

| 路径 | 优先级 | 作用域 |
|------|--------|--------|
| `.claude/loop.md` | 🥇 最高 | 项目级 |
| `~/.claude/loop.md` | 🥈 | 用户级全局 |

**特点：**
- 纯 Markdown，无固定结构
- 内容超过 25,000 字节约会在下次迭代生效
- 运行时修改 → **下次迭代立即生效**（热重载）

**示例：**

```markdown
# 我的项目 loop

检查 `release/next` 分支的 PR。
如果 CI 红了，拉取失败日志、诊断并推送最小修复。
如果有新的 review comments，逐个处理并 resolve 线程。
如果一切正常且安静，一句话汇报。
```

### 3.4 一次性提醒

```bash
remind me at 3pm to push the release branch
in 45 minutes, check whether the integration tests passed
```

Claude 将其转换为一次性 cron 任务，触发后自动删除。

### 3.5 管理定时任务

```bash
# 列出所有任务
what scheduled tasks do I have?

# 取消某任务
cancel the deploy check job
```

底层调用 `CronCreate`、`CronList`、`CronDelete` 工具。

### 3.6 取消 loop

| 方式 | 效果 |
|------|------|
| 按 `Esc` | 清除下一次 pending wakeup（当前迭代完成后不再触发） |
| 自然语言取消 | `cancel the X job` |
| 结束会话 | 所有 loop 立即停止 |
| `claude --resume` | 恢复 7 天内未过期的 loop |

### 3.7 保持长期运行

```bash
# tmux 方式（推荐）
tmux new -s claude-loop
claude
# 执行 /loop 后
# Ctrl+B, D 断开
# tmux attach -t claude-loop 恢复

# screen 方式
screen -S claude-loop
```

### 3.8 间隔选择参考

| 场景 | 建议间隔 | 每日约跑次数 | 年化成本估算 |
|------|---------|------------|------------|
| 部署轮询 | 1-5 分钟 | 288-1440 | $$-$$$$ |
| CI 监控 | 5-10 分钟 | 144-288 | $$ |
| PR 维护 | 10-30 分钟 | 48-144 | $ |
| 代码质量扫描 | 1-6 小时 | 4-24 | $ |
| 日报摘要 | 24 小时 | 1 | 可忽略 |

成本估算基于单次运行约 $0.03-$0.10（取决于模型和任务复杂度）。

---

## 四、权限模式：让 loop 在无人值守时正常工作

这是使用 `/loop` 最关键的配置项。默认权限模式下 loop 会被 `Allow this command?` 弹框卡死。

### 4.1 权限模式速览

| 模式 | 文件编辑 | Bash 命令 | 适合 loop？ |
|------|---------|----------|------------|
| `default` | 弹框 | 弹框 | ❌ 会卡死 |
| `acceptEdits` | ✅ 自动放行 | 弹框 | ⚠️ 只写文件可用 |
| `auto` | ✅ 分类器判断 | ✅ 分类器判断 | ✅ **最佳选择** |
| `dontAsk` | ❌ 白名单外拒绝 | ❌ 白名单外拒绝 | ⚠️ 仅 CI 场景 |
| `bypassPermissions` | ✅ 全部放行 | ✅ 全部放行 | ✅ 仅限容器 |

### 4.2 推荐方案：auto mode + allowlist

```bash
# 启动 loop 时必须指定权限模式
claude -w <feature> --permission-mode auto
# 进入 Claude 后
/loop 10m
```

**auto mode 自动放行：** 文件编辑、工作目录内操作、安装 lockfile 已声明的依赖、读取 `.env` 发给匹配 API、只读 HTTP、推送到已启动的分支。

**auto mode 默认拦截：** `curl | bash`、向外部发送敏感数据、生产部署、强制推 main、`git reset --hard`、`terraform destroy`。

如果 auto mode 不可用（需要 Claude Opus 4.6+ 或 Sonnet 4.6+），备选方案：

```json
// ~/.claude/settings.json
{
  "permissions": {
    "defaultMode": "acceptEdits",
    "allow": [
      "Bash(npm *)",
      "Bash(git *)",
      "Bash(pytest *)",
      "Bash(comet *)",
      "Read",
      "Edit",
      "Write"
    ]
  }
}
```

### 4.3 `~/claude/settings.json` 配置示例

```json
{
  "permissions": {
    "defaultMode": "auto"
  }
}
```

**注意：** `defaultMode: "auto"` 只能放在 `~/.claude/settings.json`（用户级），不能放在项目级 `.claude/settings.json`（防止仓库给自己授权 auto mode）。

---

## 五、`/loop` 与 Comet 的结合使用

### 5.1 Comet 是什么

Comet 是一个**5 站式 AI Software Factory 流程编排系统**。它将一个变更（change）的完整生命周期划分为五个阶段，每个阶段有明确定义的产物和质量门禁。

```
  Open      Design      Build        Verify     Archive
立项 ──→ 深度设计 ──→ 沙盒构建 ──→ 验证收尾 ──→ 归档沉淀
  │          │          │            │           │
  │          │      ╔══════════════════╗          │
  │          │      ║  /loop 在此发力 ║          │
  │          │      ╚══════════════════╝          │
 proposal   Design   TDD 循环      Spec       合并
 design     Doc      RED→GREEN     compliance  归档
 tasks      Delta    →REFACTOR     Code Review
            Spec     commit+push   安全检查
```

### 5.2 Comet 的 5 个阶段

| 阶段 | 命令 | 产物 | 质量门禁 |
|------|------|------|---------|
| **Open** | `/comet-open` | `proposal.md`、`design.md`、`tasks.md` | 产物完整性、范围边界确认 |
| **Design** | `/comet-design` | Design Doc、Delta Spec、交接包 | handoff hash 校验、Phase Guard |
| **Build** | `/comet-build` | 代码、测试、提交记录 | TDD 循环（RED→GREEN→REFACTOR）、全量测试 |
| **Verify** | `/comet-verify` | 审查报告 | Spec compliance、Code Review、安全检查 |
| **Archive** | `/comet-archive` | 归档记录 | 增量规范合并、verify_result=pass |

每个 change 的当前状态记录在 `.comet.yaml` 中。Phase Guard 在阶段入口检查产物完整性。

### 5.3 Comet + `/loop` 的协作关系

```
Comet（项目经理）                    /loop（施工队长）
─────────────────                   ─────────────────
定义质量门禁                        在每个门禁内自动执行
定义阶段转换条件                    持续监控进度并推进
控制做"什么"（WHAT）               控制"什么时候"做（WHEN）
输出结构化的可追溯变更              输出持续推进的进度
```

**协作流程：**

```
   Comet 定义好的 change
        │
        ▼
   启动 /loop（auto mode）
        │
        ▼
  ┌──────────────────────────────────────┐
  │                                      │
  │  loop 每次迭代:                      │
  │   1. 读 .comet.yaml → 当前阶段       │
  │   2. 执行该阶段的下一个微任务         │
  │   3. 检查质量门禁是否满足             │
  │   4. 满足 → 更新 .comet.yaml 到下一阶段│
  │   5. 不满足 → 继续当前阶段            │
  │   6. commit + push                    │
  │                                      │
  └──────────────────────────────────────┘
        │
        ▼
   人类回来：审查 /comet-archive → 合并
```

### 5.4 `.claude/loop.md` 完整模板（Comet 版）

实际使用文件见本文附录。核心框架如下：

```markdown
# Comet 自动推进 Loop
## 权限模式：auto mode

## 权威数据源
- `.comet.yaml` — 当前 change 的阶段、产物路径、状态
- `openspec/changes/<活跃change>/tasks.md` — 微任务清单
- `docs/superpowers/specs/` — Design Doc 和 Delta Spec

## 全局约束
- ❌ 不碰 main/master 分支
- ❌ 不 merge/close 他人 PR
- ❌ 不执行破坏性操作

## 阶段自动推进

### Open 阶段
检查 proposal.md / design.md / tasks.md 是否齐全
→ 缺少哪个产哪个 → Phase Guard 验证通过 → 进入 Design

### Design 阶段
基于 proposal 写 Design Doc → 生成 Delta Spec → 生成交接包
→ Phase Guard 验证通过 → 进入 Build

### Build 阶段（TDD 循环）
读取 tasks.md → 找未完成的 task
P1: 写失败测试（RED）
P2: 写实现通过测试（GREEN）
P3: 重构（REFACTOR）
P4: 全部 task 完成 → 全量测试绿 → 进入 Verify

### Verify 阶段
Spec compliance → Code Review → 安全检查
→ 全部通过 → 进入 Archive（等人类确认）

## 权限处理策略（auto mode）
仅做替代方案尝试，不做绕过。
连续 3 次拦截 → 输出卡住报告。

## 阻塞处理
同一 task 卡 3 次迭代 → 输出阻塞报告 → 跳到下一个。
所有 task 卡住 → 停止 loop，等人处理。
```

---

## 六、搭配 Comet 使用 `/loop` 的案例

### 案例 1：夜间无人推进

**场景：** Design 阶段已完成，需要自动完成 Build 阶段的 TDD 循环。

```bash
# 18:00 下班前
claude -w auth-module --permission-mode auto
/comet-open    # 已完成
/comet-design  # 已完成 → .comet.yaml phase=build
/loop 10m
# 断开 tmux：Ctrl+B, D
```

| 时间 | 迭代 | 发生了什么 |
|------|------|-----------|
| 18:00 | 1 | 读取 `.comet.yaml` → phase=build。读取 `tasks.md` → task 1：写用户注册 API |
| 18:10 | 2 | TDD RED：写会失败的注册测试 |
| 18:20 | 3 | TDD GREEN：实现注册逻辑，测试通过 |
| 18:30 | 4 | TDD REFACTOR：优化错误处理 |
| 18:40 | 5 | commit + push task 1。开始 task 2：登录 API |
| 18:50 | 6 | TDD RED：写登录测试 |
| 19:00 | 7 | TDD GREEN：实现登录 + JWT |
| 19:10 | 8 | REFACTOR → commit + push |
| ... | ... | 继续后续 task... |
| 22:00 | ~24 | 全部 task 完成，全量测试绿 |
| 22:10 | 25 | 自动进入 Verify 阶段 |
| 22:20 | 26 | Spec compliance 检查通过 |
| 22:30 | 27 | Code Review → 发现一个边界条件未处理 → 修复 |
| 22:40 | 28 | 安全检查通过 |
| 22:50 | 29 | 更新 `.comet.yaml` phase=archive verify_result=pass → 输出"等人类确认" |

**早上 9:00 你回来：**

```bash
# 审查进度
cat docs/loop-logs/2026-06-26-auth-module.md
# 发现一切就绪
claude --resume auth-module
/comet-archive
# 合并 PR
```

### 案例 2：CI 变红后的自动修复

**场景：** Build 阶段 loop 正在推进，CI 突然红了。

```
loop 迭代 10：正在写 task 4 的测试
        │
        ▼
git push 后 CI trigger
        │
        ▼
loop 迭代 11：读取 tasks.md → 发现 CI 红色
        │
        ▼
自动暂停当前 task → 读取 CI 日志（gh run view --log）
        │
        ▼
诊断：测试环境少了环境变量
        │
        ▼
修复：更新测试配置 → commit → push
        │
        ▼
loop 迭代 12：确认 CI 变绿 → 回到 task 4 继续 TDD
```

### 案例 3：质量门禁拦截后的自动修复

**场景：** loop 试图从 Design 进入 Build，Phase Guard 检测到 handoff hash 不匹配。

```
loop 迭代 5：Design 阶段产物齐全，尝试推进
        │
        ▼
Phase Guard: state check <change> design
        │
        ▼
⛔ 失败：handoff hash 与当前产物不匹配
        │
        ▼
自动重新生成交接包
  → handoff/design-context.json
  → handoff/design-context.md
        │
        ▼
再次跑 Phase Guard → ✅ 通过
        │
        ▼
更新 .comet.yaml phase=build
进入 Build 阶段
```

### 案例 4：多个 change 并行推进

**场景：** 三个独立的 feature 需要同时开发，各自在不同 worktree 中由 loop 推进。

```bash
# 终端 1：auth 模块
cd /project
tmux new -s comet-auth
claude -w change-auth --permission-mode auto
/loop 10m

# 终端 2：payment 模块
tmux new -s comet-payment
claude -w change-payment --permission-mode auto
/loop 15m

# 终端 3：notification 模块
tmux new -s comet-notification
claude -w change-notification --permission-mode auto
/loop 20m
```

| change | 初始阶段 | 过夜后 | 推进内容 |
|--------|---------|--------|---------|
| auth | Build | ✅ Verify 完成 | 完整用户认证体系（注册、登录、JWT、中间件） |
| payment | Design | ✅ Build 完成 60% | Stripe 集成、支付流程、退款逻辑 |
| notification | Open | ✅ Design 完成 | 邮件+站内信通知架构设计 |

### 案例 5：loop 卡住后生成报告

**场景：** auto mode 分类器连续三次拦截同一操作，loop 暂停。

```
loop 迭代 14：需要删除旧的 migration 文件
        │
        ▼
auto mode 拦截：rm -rf 被分类器拒绝（不可逆删除）
        │
        ▼
替代方案：逐个文件删除（unlink）
        │
        ▼
auto mode 再次拦截：批量删除操作被拒绝
        │
        ▼
第三次尝试：git mv 到 archive/ 目录
        │
        ▼
依然被拦截（跨目录文件操作）
        │
        ▼
auto mode 暂停 → 等待人类
        │
        ▼
Claude 输出卡住报告：

docs/blockers/2026-06-27-auth-module.md
─────────────────────────────────────
Change: auth-module · 当前阶段: Build
已完成的 task: 1-5（共 8 个）
卡在第 6 个 task: 清理旧的 migration 文件

被拦截的操作（连续 3 次）:
  1. rm -rf src/migrations/old/
  2. unlink 逐个文件删除
  3. git mv → archive/

建议: 在 allowlist 中加入 "Bash(rm src/migrations/old/*)"
      或手动执行一次删除后恢复 loop
─────────────────────────────────────
```

---

## 七、关键限制

| 限制 | 说明 | 应对方案 |
|------|------|---------|
| 进程绑定 | 会话关闭则 loop 停止 | tmux/screen 保活，或用 Desktop 定时任务 |
| 上下文膨胀 | 每次迭代累积历史，增 token 消耗 | 定期 `/compact`；或设计自包含 prompt |
| 7 天过期 | 定时任务自动终止 | 续期取消重建，或用 Routines（云端） |
| 权限弹框 | 默认模式会卡死 | **必须指定 `--permission-mode auto`** |
| 无补偿执行 | 错过的时间点不补跑 | loop 间隔 ≥ 单次执行时长 |
| 无原生告警 | 只在终端输出 | 让 Claude 通过 `curl` 调 webhook 通知 |
| jitter | 定期任务有 0-30 分钟偏移 | 精确调度用 `:03` 代替 `:00` |

---

## 八、一句话总结

| 层次 | 组件 | 职责 |
|------|------|------|
| 🎯 **流程定义** | **Comet** | 定义阶段的产物、质量门禁、转换条件 |
| 🔁 **自动执行** | **`/loop`** | 在 Comet 定义的门禁内无人值守地持续推进 |
| 🔐 **安全保障** | **auto mode** | 运行时 AI 分类器判断每个操作是否安全 |
| 🧑 **最终决策** | **人类** | 审查归档、合并 PR |

---

## 参考资料

| 内容 | 链接 |
|------|------|
| 官方 `/loop` 文档 | https://code.claude.com/docs/en/commands |
| 官方定时任务文档 | https://code.claude.com/docs/en/scheduled-tasks |
| 权限模式文档 | https://code.claude.com/docs/en/permission-modes |
| auto mode 公告 | https://claude.com/blog/auto-mode |
| auto mode 深入解析 | https://www.anthropic.com/engineering/claude-code-auto-mode |
| loop.md 自定义 | https://code.claude.com/docs/en/scheduled-tasks#customize-the-default-prompt-with-loop-md |
| Routines（云端持久方案） | https://code.claude.com/docs/en/routines |
| Desktop 定时任务 | https://code.claude.com/docs/en/desktop-scheduled-tasks |
