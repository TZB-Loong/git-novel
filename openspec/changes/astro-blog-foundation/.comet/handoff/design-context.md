# Comet Design Handoff

- Change: astro-blog-foundation
- Phase: design
- Mode: compact
- Context hash: 86e6e259cba1dd75c6b3615c824527290d20084ad22f9cc0e258d5def26df3ef

Generated-by: comet-handoff.sh

OpenSpec remains the canonical capability spec. This handoff is a deterministic, source-traceable context pack, not an agent-authored summary.

## openspec/changes/astro-blog-foundation/proposal.md

- Source: openspec/changes/astro-blog-foundation/proposal.md
- Lines: 1-33
- SHA256: e56530026a584a6cd8b14c20b300196931308a5a0517eb00db9d7a0fd1193251

```md
## Why

需要一个依托于 GitHub 的个人博客，对外共享 Markdown 笔记、图片相册、图片笔记卡片流等文章内容。当前缺少统一的发布渠道：笔记散落在本地 Obsidian 库中无法对外分享，图片缺乏组织化的展示页面。借助 GitHub Pages 的免费托管与 Git 工作流，可以以零运维成本建立可持续维护的内容发布站点，并让内容版本化、可追溯。

## What Changes

- 初始化 Astro 静态站点项目骨架（TypeScript + 内容集合）
- 建立 Markdown 文章/笔记内容管线：frontmatter 规范、分类标签、目录、TOC、代码高亮、RSS
- 新增图片相册/图集页：按相册分组、网格瀑布流、Lightbox 放大浏览
- 新增图片笔记卡片流：自动为含图片的笔记生成缩略图卡片，按时间线展示
- 集成评论系统（Giscus，基于 GitHub Discussions）
- 配置 GitHub Actions 工作流：推送 main 分支自动构建并部署到 GitHub Pages
- 配置站点元信息、SEO、sitemap、社交分享卡片

## Capabilities

### New Capabilities
- `content-publishing`: Markdown 文章与笔记的内容集合、frontmatter 规范、分类/标签、目录、TOC、代码高亮、RSS 订阅
- `photo-gallery`: 图片相册/图集页（相册分组、网格/瀑布流、Lightbox 放大）与图片笔记卡片流（时间线展示）
- `reader-comments`: 基于 Giscus 的文章评论系统集成与配置
- `site-deployment`: GitHub Actions 构建工作流与 GitHub Pages 发布配置

### Modified Capabilities
<!-- 无现有 spec，全部为新增 -->

## Impact

- **代码**：新建 Astro 项目（`src/`、`astro.config.ts`、`package.json`、`tsconfig.json`）
- **内容目录**：新增 `src/content/`（文章/笔记集合）、`public/gallery/` 或 `src/assets/gallery/`（图片资源）
- **CI/CD**：新增 `.github/workflows/deploy.yml`，需在仓库 Settings → Pages 启用 Actions 部署
- **依赖**：Astro、@astrojs/rss、@astrojs/sitemap、Giscus React 组件、图片处理相关集成（如 astro-imagetools 或 @astrojs/image）
- **外部服务**：GitHub Pages（托管）、GitHub Discussions（评论承载）
- **后续依赖**：change 2（obsidian-migration）将依赖本项目的内容集合 schema 与 frontmatter 规范
```

## openspec/changes/astro-blog-foundation/design.md

- Source: openspec/changes/astro-blog-foundation/design.md
- Lines: 1-107
- SHA256: bf04659e9cf73946d8d5983768fe484b53279c54cee267480b0c67854de8f8f4

[TRUNCATED]

```md
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
```

Full source: openspec/changes/astro-blog-foundation/design.md

## openspec/changes/astro-blog-foundation/tasks.md

- Source: openspec/changes/astro-blog-foundation/tasks.md
- Lines: 1-80
- SHA256: a43fbdce690fe5750b3c29edf6d19905753f2cebea3aa0111b4f0015a1414be8

```md
## 1. 项目初始化

- [ ] 1.1 在仓库根目录 `git init`，配置 `.gitignore`（node_modules、dist、.astro、.DS_Store）
- [ ] 1.2 初始化 Astro 5 项目（`npm create astro@latest`，选 Empty + TypeScript strict）
- [ ] 1.3 配置 `astro.config.ts`（`site`、`base`、`integrations: [mdx, sitemap]`）
- [ ] 1.4 配置 `tsconfig.json` strict 模式
- [ ] 1.5 安装核心依赖：`@astrojs/rss`、`@astrojs/sitemap`、`@astrojs/mdx`

## 2. 内容集合与 Schema

- [ ] 2.1 创建 `src/content/config.ts`，定义 `articles` 集合（title、pubDate、updateDate、description、tags、category、draft）
- [ ] 2.2 定义 `notes` 集合（title、pubDate、cover、tags、draft）
- [ ] 2.3 定义 `albums` 集合（title、date、cover、images[]、description）
- [ ] 2.4 创建示例文章 `src/content/articles/hello.md` 与示例笔记 `src/content/notes/sample.md`

## 3. 布局与公共组件

- [ ] 3.1 创建 `BaseLayout.astro`（HTML 骨架、meta、SEO、Open Graph、sitemap link）
- [ ] 3.2 创建 `BaseHead.astro`（favicon、canonical、RSS link、社交卡片）
- [ ] 3.3 创建导航/Header 组件（首页、文章、笔记、相册）
- [ ] 3.4 创建 Footer 组件
- [ ] 3.5 配置全局样式（CSS 变量、暗色模式、响应式断点）

## 4. 文章/笔记发布管线

- [ ] 4.1 创建 `articles/[...slug].astro` 动态路由，渲染文章 + TOC + 上下篇
- [ ] 4.2 创建 `notes/[...slug].astro` 动态路由，渲染笔记
- [ ] 4.3 创建 `articles/index.astro` 文章列表（按分类/标签筛选）
- [ ] 4.4 创建首页 `index.astro`（最新文章列表）
- [ ] 4.5 集成代码高亮（Shiki，Astro 内置）
- [ ] 4.6 生成 RSS `rss.xml.xml`（@astrojs/rss）
- [ ] 4.7 生成 `sitemap-index.xml`（@astrojs/sitemap）

## 5. 图片相册

- [ ] 5.1 创建 `gallery/index.astro` 相册索引页（列出所有 albums）
- [ ] 5.2 创建 `gallery/[album].astro` 单相册页（CSS Grid 布局）
- [ ] 5.3 集成 GLightbox（npm 安装 + 组件封装 `Lightbox.astro`）
- [ ] 5.4 使用 `astro:assets` 生成相册缩略图（WebP/AVIF）
- [ ] 5.5 创建示例相册 `src/content/albums/demo.md` + 示例图片

## 6. 图片笔记卡片流

- [ ] 6.1 创建 `notes/index.astro` 笔记卡片流页（查询含 cover 的 notes，按 pubDate 倒序）
- [ ] 6.2 实现 `NoteCard.astro` 卡片组件（封面缩略图 + 标题 + 日期）
- [ ] 6.3 首页增加"图片笔记"区块，展示最近 N 条卡片

## 7. 评论系统

- [ ] 7.1 仓库启用 GitHub Discussions
- [ ] 7.2 安装 Giscus App 到仓库，配置 mapping（pathname）
- [ ] 7.3 创建 `Giscus.astro` 组件（react 包裹，懒加载）
- [ ] 7.4 在文章与笔记详情页底部嵌入 Giscus 组件

## 8. CI/CD 部署

- [ ] 8.1 创建 `.github/workflows/deploy.yml`（on push to main，使用 `withastro/action@v3`）
- [ ] 8.2 配置 workflow 权限（contents: read、pages: write、id-token: write）与 environment: github-pages
- [ ] 8.3 配置 Pages deployment step（upload-pages-artifact + deploy-pages@v4）
- [ ] 8.4 在 build 前增加 test step：`npm ci && npm test -- --coverage`
- [ ] 8.5 仓库 Settings → Pages → Source 设为 "GitHub Actions"
- [ ] 8.6 推送 main 触发首次部署，验证站点可访问

## 9. 测试

- [ ] 9.1 安装 Vitest + @vitest/coverage-v8，配置 `vitest.config.ts`（coverage glob 排除 .astro）
- [ ] 9.2 编写 `src/lib/slug.test.ts`：中文→pinyin、特殊字符、重复 slug 检测
- [ ] 9.3 编写 `src/lib/date.test.ts`：ISO 解析、格式化、时区处理
- [ ] 9.4 编写 `src/content/config.test.ts`：articles/notes/albums schema 校验（必填、类型、draft 默认值）
- [ ] 9.5 编写 `src/lib/gallery.test.ts`：相册图片收集与排序
- [ ] 9.6 验证工具函数覆盖率 ≥ 80%

## 10. 验证与收尾

- [ ] 10.1 本地 `npm run dev` 验证所有页面路由可访问
- [ ] 10.2 本地 `npm run build` 验证构建无报错
- [ ] 10.3 验证 SEO meta、RSS、sitemap 输出正确
- [ ] 10.4 验证 Giscus 评论加载正常
- [ ] 10.5 编写 README.md（本地开发、内容添加、部署说明）
- [ ] 10.6 为 change 2（obsidian-migration）记录 frontmatter schema 契约（写入 docs/superpowers/specs/ design doc 第 3、10 节）
```

## openspec/changes/astro-blog-foundation/specs/content-publishing/spec.md

- Source: openspec/changes/astro-blog-foundation/specs/content-publishing/spec.md
- Lines: 1-73
- SHA256: e24bf9a23cfd763b7edb1688206c98d88362b48ac206ec7ce30afa506dd2accb

```md
## ADDED Requirements

### Requirement: Markdown 内容集合

系统 SHALL 通过 Astro Content Collections 管理 Markdown 文章（articles）与笔记（notes），每个集合 MUST 在 `src/content/config.ts` 定义 frontmatter schema 并进行类型校验。

articles 集合 frontmatter MUST 包含：`title`(string,必填)、`pubDate`(date,必填)、`description`(string,必填)；可选：`updateDate`(date)、`tags`(string[])、`category`(string)、`draft`(boolean,默认 false)。

notes 集合 frontmatter MUST 包含：`title`(string,必填)、`pubDate`(date,必填)；可选：`cover`(string)、`tags`(string[])、`draft`(boolean,默认 false)。

#### Scenario: 合法 frontmatter 通过校验
- **WHEN** 文章 frontmatter 包含必填字段且类型正确
- **THEN** 构建成功，文章出现在集合查询结果中

#### Scenario: 缺失必填字段构建失败
- **WHEN** 文章 frontmatter 缺少 `title` 或 `pubDate` 或 `description`
- **THEN** `npm run build` 报错并指出具体字段缺失

#### Scenario: draft 文章在生产环境隐藏
- **WHEN** 文章 `draft: true` 且 `import.meta.env.PROD` 为 true
- **THEN** 该文章不出现在文章列表与 RSS 中，直接访问路由返回 404

#### Scenario: draft 文章在开发环境可见
- **WHEN** 文章 `draft: true` 且 `import.meta.env.DEV` 为 true
- **THEN** 该文章在开发服务器中可见可访问

### Requirement: Slug 生成

系统 SHALL 由 Markdown 文件名自动生成 URL slug；中文文件名 MUST 通过 pinyin 转换为 ASCII slug；重复 slug MUST 在构建期报错。

#### Scenario: 中文文件名转 pinyin slug
- **WHEN** 文章文件名为 `我的第一篇文章.md`
- **THEN** 生成的 slug 为 pinyin 形式（如 `wo-de-di-yi-pian-wen-zhang`），URL 为 `/git-novel/articles/wo-de-di-yi-pian-wen-zhang/`

#### Scenario: 重复 slug 构建失败
- **WHEN** 两个文件生成相同 slug
- **THEN** `npm run build` 报错并列出冲突文件名

### Requirement: TOC 与上下篇导航

文章详情页 SHALL 自动生成目录（TOC），包含 h2/h3 两级标题；SHALL 显示上一篇与下一篇导航（按 pubDate 相邻）。

#### Scenario: TOC 从 headings 生成
- **WHEN** 文章包含 `## 二级标题` 与 `### 三级标题`
- **THEN** 页面侧边或顶部显示 TOC，点击可锚跳转

#### Scenario: 上下篇按日期相邻
- **WHEN** 访问某文章详情页
- **THEN** 页面底部显示按 pubDate 排序的前一篇与后一篇链接（若存在）

### Requirement: RSS 订阅

系统 SHALL 在 `/rss.xml` 提供 RSS feed，包含最近 20 篇非 draft 文章，按 pubDate 倒序。

#### Scenario: RSS 输出最近文章
- **WHEN** 访问 `/git-novel/rss.xml`
- **THEN** 返回合法 Atom/RSS XML，包含最多 20 篇文章的 title、link、description、pubDate

### Requirement: Sitemap

系统 SHALL 通过 @astrojs/sitemap 自动生成 `/sitemap-index.xml`，包含所有公开页面 URL。

#### Scenario: sitemap 包含所有路由
- **WHEN** 访问 `/git-novel/sitemap-index.xml`
- **THEN** 返回包含首页、文章列表、所有公开文章/笔记/相册 URL 的 sitemap

### Requirement: 代码高亮

系统 SHALL 使用 Shiki（Astro 内置）对文章与笔记中的代码块进行语法高亮，支持暗色模式适配。

#### Scenario: 代码块语法高亮
- **WHEN** 文章包含 ` ```ts ` 代码块
- **THEN** 渲染后的 HTML 包含 Shiki 生成的带语法高亮的 `<pre><code>`，暗色模式下使用暗色主题
```

## openspec/changes/astro-blog-foundation/specs/photo-gallery/spec.md

- Source: openspec/changes/astro-blog-foundation/specs/photo-gallery/spec.md
- Lines: 1-59
- SHA256: 635a9f98cdd361d6e04e43d82716daf9eae58b46182be4a019719d5d4a292d03

```md
## ADDED Requirements

### Requirement: 相册集合

系统 SHALL 通过 `albums` 内容集合管理相册元数据。frontmatter MUST 包含：`title`(string,必填)、`date`(date,必填)、`images`(string[],必填)；可选：`cover`(string)、`description`(string)。

`images` 数组中的路径 MUST 相对 `src/assets/gallery/<album-slug>/` 目录。

#### Scenario: 相册元数据校验
- **WHEN** 相册 frontmatter 包含必填字段且 `images` 非空
- **THEN** 相册出现在相册索引页，构建成功

#### Scenario: images 为空构建失败
- **WHEN** 相册 `images` 为空数组或缺失
- **THEN** `npm run build` 报错

### Requirement: 相册索引页

系统 SHALL 在 `/gallery/` 提供相册索引页，列出全部相册（按 date 倒序），每个相册显示封面、标题、日期。

#### Scenario: 相册索引列出全部相册
- **WHEN** 访问 `/git-novel/gallery/`
- **THEN** 页面显示所有相册卡片，每张卡片含封面缩略图、标题、日期，按 date 倒序排列

### Requirement: 单相册页与 Lightbox

系统 SHALL 在 `/gallery/[album]` 提供单相册页，以 CSS Grid 网格布局展示所有图片；点击图片 SHALL 打开 GLightbox 全屏放大，支持键盘左右切换与 ESC 关闭。

#### Scenario: 相册网格布局展示
- **WHEN** 访问某相册页
- **THEN** 所有图片以网格排列，每张图片显示为缩略图（Astro 自动生成的 WebP/AVIF）

#### Scenario: 点击图片打开 Lightbox
- **WHEN** 用户点击相册中的某张图片
- **THEN** GLightbox 打开该图片全尺寸版本，支持左右箭头切换上一张/下一张，ESC 关闭

#### Scenario: 图片自动优化
- **WHEN** 相册原图为 PNG/JPEG
- **THEN** 构建期通过 `astro:assets` 生成 WebP/AVIF 响应式缩略图，HTML 中 `<img>` 使用 `srcset`

### Requirement: 图片笔记卡片流

系统 SHALL 在 `/notes/` 提供图片笔记卡片流，展示所有含 `cover` 字段的 notes，按 pubDate 倒序排列为卡片网格。每张卡片 MUST 显示封面缩略图、标题、日期。

#### Scenario: 卡片流仅显示含封面的笔记
- **WHEN** 访问 `/git-novel/notes/`
- **THEN** 页面显示所有 `cover` 字段非空的 notes 卡片，按 pubDate 倒序；无 cover 的笔记不出现

#### Scenario: 卡片点击跳转详情
- **WHEN** 用户点击某张笔记卡片
- **THEN** 跳转到该笔记详情页 `/git-novel/notes/<slug>/`

### Requirement: 首页图片笔记区块

系统 SHALL 在首页 `/` 展示最近 6 条含 cover 的 notes 卡片。

#### Scenario: 首页展示最近图片笔记
- **WHEN** 访问 `/git-novel/`
- **THEN** 首页包含"图片笔记"区块，显示最近 6 条含 cover 的 notes 卡片，点击跳转对应详情页
```

## openspec/changes/astro-blog-foundation/specs/reader-comments/spec.md

- Source: openspec/changes/astro-blog-foundation/specs/reader-comments/spec.md
- Lines: 1-37
- SHA256: a6bbf4251d21b80fdfee78c4446106bfb69658095d8fbf5372f6778cf6e8d720

```md
## ADDED Requirements

### Requirement: Giscus 评论集成

系统 SHALL 在文章与笔记详情页底部集成 Giscus 评论组件，基于 GitHub Discussions 承载评论数据。Giscus 配置 MUST 存储在 `src/lib/config.ts`，包含 `data-repo`、`data-repo-id`、`data-category`、`data-category-id`、`mapping`、`theme`、`reactionsEnabled`。

#### Scenario: 详情页加载评论
- **WHEN** 访问某文章或笔记详情页
- **THEN** 页面底部渲染 Giscus iframe，加载该路由对应的 GitHub Discussion 评论

#### Scenario: Giscus 配置缺失时构建不阻断
- **WHEN** `src/lib/config.ts` 中 Giscus 配置为空（占位值）
- **THEN** 构建成功，详情页显示"Giscus 未配置"占位提示，不阻断部署

### Requirement: 评论懒加载

Giscus 组件 SHALL 使用 `client:idle` 指令懒加载，避免阻塞页面首屏渲染。

#### Scenario: 评论在空闲时加载
- **WHEN** 用户打开详情页
- **THEN** 页面首屏内容（标题、正文）优先渲染，Giscus 在浏览器空闲时才加载

### Requirement: 评论与路由映射

Giscus `mapping` MUST 设为 `pathname`，每条文章/笔记路由对应一个独立的 GitHub Discussion 线程。

#### Scenario: 不同路由对应不同 Discussion
- **WHEN** 用户在文章 A 与文章 B 分别评论
- **THEN** 两篇文章的评论相互独立，存储在不同的 Discussion 中

### Requirement: 暗色模式适配

Giscus 主题 SHALL 跟随站点暗色模式切换（`data-theme="dark"` / `light`）。

#### Scenario: 暗色模式下评论主题切换
- **WHEN** 用户切换站点暗色模式
- **THEN** Giscus iframe 重新加载为对应主题（dark 或 light）
```

## openspec/changes/astro-blog-foundation/specs/site-deployment/spec.md

- Source: openspec/changes/astro-blog-foundation/specs/site-deployment/spec.md
- Lines: 1-57
- SHA256: d653f8909a6897f12a8762a24b52aa7fa3938b4346cd8b0f72373cf60f83bfdf

```md
## ADDED Requirements

### Requirement: GitHub Actions 自动部署

系统 SHALL 通过 `.github/workflows/deploy.yml` 在 main 分支推送时自动构建并部署到 GitHub Pages。workflow MUST 使用 `withastro/action@v3` 构建站点，使用 `actions/deploy-pages@v4` 部署产物。

#### Scenario: 推送 main 触发部署
- **WHEN** 向 main 分支推送 commit
- **THEN** GitHub Actions 触发 deploy workflow，构建成功后站点更新到 GitHub Pages

#### Scenario: 手动触发部署
- **WHEN** 在 GitHub Actions UI 手动运行 workflow_dispatch
- **THEN** workflow 执行构建与部署

### Requirement: 构建前测试

deploy workflow MUST 在构建前运行 `npm test -- --coverage`，测试失败时阻断部署。

#### Scenario: 测试失败阻断部署
- **WHEN** `npm test` 退出码非 0
- **THEN** workflow 在测试步骤失败，不执行 build 与 deploy，GitHub Pages 保持上次成功部署

#### Scenario: 测试通过继续部署
- **WHEN** `npm test` 退出码为 0
- **THEN** workflow 继续 `npm run build` 与部署

### Requirement: Pages 权限配置

deploy workflow MUST 声明 `permissions: contents: read, pages: write, id-token: write`，部署 job MUST 使用 `environment: github-pages`。

#### Scenario: 权限正确配置
- **WHEN** workflow 运行
- **THEN** deploy job 在 github-pages environment 下执行，具有写入 Pages 的权限

### Requirement: base path 配置

`astro.config.ts` MUST 配置 `site` 为完整 GitHub Pages URL（`https://<user>.github.io`），`base` 为 `/git-novel`，以匹配项目仓库的 Pages 路径。

#### Scenario: 内部链接带 base 前缀
- **WHEN** 站点部署到 `https://<user>.github.io/git-novel/`
- **THEN** 所有内部链接、静态资源、RSS、sitemap 路径均以 `/git-novel/` 为前缀，无 404

#### Scenario: canonical 与 OG 输出绝对 URL
- **WHEN** 访问任意页面
- **THEN** `<link rel="canonical">` 与 Open Graph `og:url` 输出 `https://<user>.github.io/git-novel/<path>` 绝对 URL

### Requirement: SEO 元信息

系统 SHALL 为每个页面生成 SEO 元信息：`<title>`、`<meta name="description">`、Open Graph（`og:title`、`og:description`、`og:url`、`og:type`）、Twitter Card。

#### Scenario: 文章页 SEO 元信息
- **WHEN** 访问某文章详情页
- **THEN** HTML `<head>` 包含文章 title 作为 `<title>`，frontmatter `description` 作为 meta description，OG 标签完整

#### Scenario: 首页 SEO 元信息
- **WHEN** 访问 `/git-novel/`
- **THEN** `<head>` 包含站点标题、站点描述、OG 标签
```

