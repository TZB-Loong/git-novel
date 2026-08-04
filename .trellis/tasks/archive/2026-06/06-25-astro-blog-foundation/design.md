## Context

全新项目，当前仓库 `/Users/loong/dev/git-novel` 已初始化 OpenSpec 与 Comet，无任何前端代码。用户希望以 Astro 为技术栈搭建博客，内容来源包括手写 Markdown 与未来从 Obsidian 迁移的笔记（change 2 处理）。部署目标为 GitHub Pages，通过 GitHub Actions 自动构建。读者为公开互联网访问者，无登录需求。

约束：
- 仓库无 git 初始化（部署阶段需先 `git init` 并推送到 GitHub）
- 内容需支持中英文混排
- 图片体积与数量预期中等（个人博客规模，非图床场景）
- 后续 Obsidian 迁移依赖本项目的内容集合 schema

## Goals / Non-Goals

**Goals:**
- 提供可复用的 Astro 博客骨架，支持 Markdown 文章/笔记、图片相册、图片笔记卡片流
- 推送即发布：main 分支推送后 GitHub Actions 自动构建并部署到 GitHub Pages
- 内容以 Git 管理，无后台 CMS
- 为 change 2（obsidian-migration）提供稳定的 frontmatter 与内容集合契约

**Non-Goals:**
- 不做用户系统、登录、权限
- 不做后台 CMS 或在线编辑器
- 不做 Obsidian 迁移（change 2）
- 不做图床、CDN、自定义域名（首期用 GitHub 默认域名）
- 不做多语言 i18n 框架（首期单中文）

## Decisions

### D1: 技术栈 — Astro 5 + Content Collections + TypeScript
**选择**：Astro 5.x，使用 Content Collections API（`src/content/config.ts`）定义文章与相册集合的 schema。
**理由**：Content Collections 提供类型安全的 frontmatter 校验，是 Astro 官方推荐的内容组织方式；为 change 2 的 Obsidian 迁移提供可校验的入口。相比 Hexo/Hugo，Astro 原生支持组件化，便于后续扩展图集交互组件。
**备选**：Hexo（Node 生态、中文主题丰富，但扩展性弱）；Hugo（极快但 Go 模板学习成本高，与本项目 Node 工具链不统一）。

### D2: 图片处理 — 本地资源 + Astro 内置图片优化
**选择**：图片存放于 `src/assets/`（随内容走）或 `public/gallery/`（相册原始图），使用 Astro 内置 `<Image>` 与 `astro:assets` 自动生成响应式图片与缩略图。
**理由**：随仓库版本化，无需外部图床；Astro 构建期生成 WebP/AVIF 缩略图，相册卡片流可复用。中等规模图片不会导致仓库过大。
**备选**：外部图床（增加复杂度、依赖第三方）；Cloudinary（过度工程）。

### D3: 相册布局 — CSS Grid + GLightbox
**选择**：相册页用 CSS Grid 网格布局（支持瀑布流变体），点击放大使用 GLightbox（轻量、无框架依赖）。
**理由**：纯 CSS + 原生 JS，无重型客户端框架；GLightbox 支持 touch、键盘、响应式，体积 ~7KB。
**备选**：PhotoSwipe（功能更强但体积大）；自研 Lightbox（无必要）。

### D4: 图片笔记卡片流 — 内容集合查询 + 缩略图卡片
**选择**：定义 `notes` 内容集合（与 `articles` 区分），frontmatter 含 `cover` 字段；卡片流页面通过 `getCollection('notes')` 查询所有含 cover 的笔记，按 `pubDate` 倒序渲染为卡片网格。
**理由**：复用 Content Collections 管线，无需额外数据源；与文章集合共享渲染逻辑。
**备选**：独立 JSON 数据文件（重复维护）；从 Obsidian 同步（change 2 范围）。

### D5: 评论 — Giscus
**选择**：Giscus（基于 GitHub Discussions）。
**理由**：Discussions 比 Issues 更适合评论场景（支持回复嵌套、点赞）；Giscus 中文社区支持好；无需自建后端。
**备选**：Utterances（基于 Issues，不适合评论）；自建评论（违背静态站点初衷）。

### D6: 部署 — GitHub Actions + Pages
**选择**：`.github/workflows/deploy.yml`，触发条件为 main 分支 push；使用 `withastro/action` 官方 action 构建；产物部署到 GitHub Pages（Source: GitHub Actions）。
**理由**：官方推荐路径，源码与产物同仓库分离（产物不污染 git 历史）；支持 Node 依赖缓存加速。
**备选**：gh-pages 分支推送（产物进 git 历史，仓库膨胀）；Cloudflare Pages（脱离 GitHub 生态）。

### D7: 主题 — 自研极简主题
**选择**：基于 Astro 官方 blog starter 自研极简主题，不引入第三方主题。
**理由**：第三方主题（AstroPaper/Fuwari）功能多但定制成本高、升级有冲突风险；自研主题代码可控，符合 KISS。
**备选**：直接用 AstroPaper（快速但定制受限）。

### D8: 内容目录结构
```
src/
  content/
    config.ts          # 集合 schema
    articles/          # 长文章
    notes/             # 短笔记（可含 cover）
  pages/
    index.astro        # 首页：最新文章 + 卡片流
    articles/[...slug].astro
    notes/[...slug].astro
    gallery/index.astro        # 相册索引
    gallery/[album].astro      # 单相册
  components/
    BaseHead.astro
    Lightbox.astro
    Giscus.astro
  layouts/
    BaseLayout.astro
  assets/gallery/     # 相册原图
public/               # 静态资源
```

## Risks / Trade-offs

- **[图片仓库膨胀]** → 限制单图 < 2MB，构建期生成缩略图；超大批量图片时再评估图床。
- **[Giscus 依赖 GitHub Discussions]** → 仓库需启用 Discussions；评论数据不在本仓库，迁移成本由 GitHub 承担。
- **[Astro 5 破坏性变更]** → 锁定主版本，CI 用 lockfile 保证可复现构建。
- **[无自定义域名首期]** → 使用 `<user>.github.io/git-novel/` 路径，需配置 `site` 与 `base`；后续接自定义域名时调整 `astro.config.ts`。
- **[Obsidian 迁移契约未定]** → 本 change 先定 frontmatter schema，change 2 负责适配；schema 变更需双方协调。

## Migration Plan

1. `git init` 当前目录并推送到 GitHub 仓库
2. 仓库 Settings → Pages → Source 设为 "GitHub Actions"
3. 仓库 Settings → 启用 Discussions（为 Giscus）
4. 安装 Giscus App 到仓库，配置 mapping
5. 推送 main 触发首次部署
6. 回滚：删除 workflow 文件或回退 commit，Pages 保持上次成功部署

## Open Questions

- 仓库命名与最终 URL 路径（`<user>.github.io/<repo>/`）需用户确认
- Giscus 分类（Announcements vs General）需用户在 Discussions 配置时选定
- 是否需要自定义 404 页面（首期可缺省）
