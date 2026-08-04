# Deployment and Publishing

> 部署、SEO 与发布流程约定，基于 `.github/workflows/deploy.yml` 与 `astro.config.ts`。

## GitHub Actions 流水线

- 触发：main 分支推送或 `workflow_dispatch` 手动触发。
- 构建前先跑 `npm test -- --coverage`，测试失败阻断部署。
- 用 `withastro/action@v3` 构建，`actions/deploy-pages@v4` 部署到 GitHub Pages。
- 权限：`contents: read`、`pages: write`、`id-token: write`，job 使用
  `environment: github-pages`。

## Base Path

- `astro.config.ts` 配置 `site`（完整 GitHub Pages URL）与 `base: '/git-novel'`。
- 内部链接、静态资源、RSS、sitemap 路径统一带 `/git-novel/` 前缀。
- canonical 与 `og:url` 输出绝对 URL（`BaseHead.astro` 基于 `Astro.site` 构造）。

## SEO

- 每个页面输出 `<title>`、`<meta name="description">`、Open Graph 与 Twitter Card。
- RSS：`/rss.xml` 输出最近 20 篇非 draft 文章。
- Sitemap：`@astrojs/sitemap` 生成 `/sitemap-index.xml`，含全部公开页面。

## 笔记发布流程

1. 封面图放 `src/assets/notes/<slug>/cover.png`。
2. 正文配图放 `src/content/notes/_<slug>/NN-name.png`。
3. 创建 `src/content/notes/<slug>.md`，frontmatter 含 `title`、`pubDate`、
   `cover`（相对 `src/assets`），可选 `tags`、`draft`。
4. 本地验证：`npm run build`（必要时先 `npm test`）。
5. 只 stage 笔记相关文件（`src/content/notes/`、`src/assets/notes/`、
   `src/content/notes/_<slug>/`）；不提交 `.agents/skills/stop-slop/` 等无关目录。
6. push main，GitHub Actions 自动构建部署。
