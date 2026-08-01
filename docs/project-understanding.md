# 项目理解报告：git-novel

> 排查时间：2026-06-26
> 项目根路径：`/Users/loong/dev/git-novel`

---

## 一、一言以蔽之

这是一个 **基于 Astro 5 的个人博客网站**，部署在 GitHub Pages。但它的真正身份远不止博客——它是一个**搭载了完整 Comet 软件工厂方法论 + OpenSpec 规范工程 + Superpowers 多Agent 工作流的 AI 驱动项目**。

简单说：**代码本身是一个个人博客，但编码过程本身是一个高度工程化的 AI 辅助开发流水线。**

---

## 二、技术栈

| 层次 | 技术 |
|------|------|
| **框架** | Astro 5（SSG 静态站点生成器） |
| **UI 扩展** | React 18 + MDX |
| **评论** | Giscus（基于 GitHub Discussions） |
| **图片** | glightbox（灯箱效果） |
| **测试** | Vitest + coverage-v8 |
| **CI/CD** | GitHub Actions（自动构建部署） |
| **部署** | GitHub Pages → `https://tzb-loong.github.io/git-novel/` |

---

## 三、网站内容类型

博客支持三种内容形态，每种都对应 Astro 的内容集合（collections）：

### 1. 文章（Articles）
- 位置：`src/content/articles/`
- 传统博客文章，有标题、日期、分类、标签
- 路由：`/articles/[...slug]`

### 2. 笔记（Notes）
- 位置：`src/content/notes/`（正文 markdown）
- 封面图：`src/assets/notes/<note-name>/`（Vite 通过 eager glob 加载）
- 截图资源：`src/content/notes/_<note-name>/`（下划线前缀表示私有目录）
- 带 `cover` 字段的笔记会出现在首页卡片流
- 已有笔记涵盖：AI Agent Skill 概念科普、认知之塔、ACP IDE、AI Blueprint、Mes Digital Neuron、NotebookLM 等一系列 AI 主题

### 3. 相册（Albums）
- 位置：`src/content/albums/`
- 图片：`src/assets/gallery/<album-slug>/`

**Schema 契约**：所有 frontmatter 的 schema 定义在 `src/content/config.ts`，有单测覆盖。

---

## 四、文档目录（docs/）

| 文件/目录 | 说明 |
|----------|------|
| `docs/superpowers/` | Superpowers 交付件（设计文档、验证报告、规范） |
| `docs/superpowers/plans/` | 实现计划 |
| `docs/superpowers/specs/` | 设计规范与 schema 契约 |
| `docs/superpowers/reports/` | 验证报告 |
| `docs/AIOps 范式：构建自愈型企业.md` | AIOps 图文笔记（刚刚生成的） |
| `docs/slide_01~15.png` | AIOps 幻灯片原图 |
| `docs/AI Agent Skill 概念科普.md` | AI Agent Skill 科普（第一次任务产出） |
| `docs/AI Agent Skill 补充资料(认知之塔).md` | Skill 与 LLM 底层原理补充 |

---

## 五、Comet / OpenSpec / Superpowers 三层工作流

这是这个项目**真正的灵魂**——一套完整的、AI 驱动的软件开发流水线。

```
┌────────────────────────────────────────────────────────────┐
│  SuperPowers（指挥层）— .superpowers/sdd/                 │
│  Claude Code CLI 驱动的多 agent 调度系统                  │
│  ├─ tasks: 22 个子 agent 任务（task-1 ~ 22）             │
│  ├─ brief/report 结对：每个任务有 brief（需求）和 report  │
│  └─ reviews: code review diff 归档                        │
├────────────────────────────────────────────────────────────┤
│  OpenSpec（规范层）— openspec/                             │
│  ├─ spec 驱动开发：4 个能力域（content-publishing,        │
│  │   photo-gallery, reader-comments, site-deployment）    │
│  └─ change 管理：archive 归档了一个完整的 change           │
├────────────────────────────────────────────────────────────┤
│  Comet（流程层）— .comet/                                  │
│  ├─ com et.yaml 状态机：open → design → build → verify →   │
│  │   archive，含 Phase Guard（阶段守卫）防止非法跳转       │
│  └─ comet-state / comet-guard / comet-handoff 脚本工具链    │
├────────────────────────────────────────────────────────────┤
│  Claude Code CLI（执行层）— .claude/                        │
│  ├─ CLAUDE.md：TDD 规则 + 笔记发布规则 + 去水印规范        │
│  ├─ rules/comet-phase-guard.md：阶段感知防漂移规则         │
│  ├─ commands/opsx/：5 个命令（explore, propose, apply,     │
│  │   archive, sync）                                       │
│  └─ skills/：25+ Claude Code 技能（comet-open ~ archive,   │
│       subagent-driven-development, TDD, debugging 等）      │
└────────────────────────────────────────────────────────────┘
```

### 关键设计

**Comet 5 阶段**（通过 `.comet/config.yaml` 控制状态机）：
1. **open** — 创建 proposal/design/tasks，禁止写代码
2. **design** — brainstorming，创建 Design Doc，禁止写代码
3. **build** — 写源码、测试、执行计划
4. **verify** — 验证实现是否符合 spec 和测试
5. **archive** — 归档变更到 openspec/changes/archive/

**Phase Guard** 规则（`.claude/rules/comet-phase-guard.md`）：
- 每轮注入，防止长上下文时遗忘流程状态
- 有"空跳检测"机制（如 direct phase:build 但没有 design_doc → 非法）
- 关键决策点必须等待用户确认，不得自动跳过
- 退出阶段需 `comet-guard --apply` 验证

**OPSX 命令系统**（`.claude/commands/opsx/`）：
- `/opsx:propose` → 创建 change proposal
- `/opsx:apply` → 执行 change 中的任务
- `/opsx:archive` → 归档完成的 change
- `/opsx:explore` → 探索模式（只读不写）
- `/opsx:sync` → 同步 delta spec 到主 spec

**Skills Lock 机制**：
- `skills-lock.json` 记录了所有 Claude Code skills 的来源（大部分来自 `obra/superpowers` GitHub 仓库），哈希锁定版本

---

## 六、生命周期证明

`.superpowers/sdd/` 的 22 个 task 记录了这个项目的完整开发过程：

```
task-1 ~ 22 = 22 个 AI 子 agent 协作完成的开发任务
每个 task: brief.md（需求描述）+ report.md（执行报告）
review-*.diff = 代码审查记录
progress.md = 进度跟踪
```

**这证明项目不是一次性写出来的，而是通过 Superpowers 多 agent 工作流，经过 22 轮分治开发 + 多轮 code review 逐步构建的。**

---

## 七、.claude/CLAUDE.md 中的硬性约束

1. **TDD 强制**：先写失败测试 → 根因分析 → 验证闭环
2. **笔记发布规则**：
   - ❌ 禁止标注"本文基于 X 整理"等来源说明
   - ❌ 截图必须去除 NotebookLM 水印（强制执行）
   - ✅ 封面图必须放在 `src/assets/notes/<name>/`（Vite 加载）
   - ✅ 截图放在 `src/content/notes/_<name>/`
3. **开发规范**：测试先行、拒绝猜测、验证闭环

---

## 八、根目录的其他文件

| 文件 | 说明 |
|------|------|
| `2026-ai-blueprint_排版_摸鱼绿(moyu-green)_预览.html` | AI Blueprint 排版预览 |
| `30分钟后端速成蓝图.pdf` | 后端速成蓝图的 PDF |
| `The_AIOps_Paradigm.pdf` | AIOps 范式原始 PDF（刚刚传入的） |
| `Standardized_IDE_AI_via_ACP.pdf` | ACP 协议 PDF |
| `skills-lock.json` | Claude Code 技能锁文件 |
