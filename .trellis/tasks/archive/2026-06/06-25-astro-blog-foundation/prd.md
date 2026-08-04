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
