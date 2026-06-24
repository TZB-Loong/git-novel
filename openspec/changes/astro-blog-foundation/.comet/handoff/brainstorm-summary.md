# Brainstorm Summary

- Change: astro-blog-foundation
- Date: 2026-06-24

## 确认的技术方案

基于 OpenSpec design.md 的 8 项决策（D1-D8），补充澄清 4 个缺口并经用户三段确认：

1. **仓库 URL 策略**：项目仓库 `git-novel`，站点 URL `https://<user>.github.io/git-novel/`，`astro.config.ts` `site='https://<user>.github.io'`、`base='/git-novel'`。
2. **测试策略**：Vitest 单元测试覆盖工具函数（slug/date/config/gallery），覆盖率 80%+；`.astro` 组件豁免（靠 build + 预览验证）。
3. **Delta spec 范围**：4 个 capability 全部创建 `specs/<name>/spec.md`，含 ADDED Requirements + Scenario。
4. **图片路径约定**：统一 `src/assets/`（相册 `src/assets/gallery/<album>/`，笔记封面 `src/assets/notes/`），`astro:assets` 构建期生成 WebP/AVIF。

## 关键取舍与风险

- **[base=/git-novel]**：内部链接用 `import.meta.env.BASE_URL` 前缀；canonical/OG 用 `new URL(path, Astro.site)`；接自定义域名需改 base 为空。
- **[Vitest 覆盖有限]**：UI 层豁免单测，全局覆盖率可能低于 80%——已在 Design Doc 第 8 节声明豁免。
- **[src/assets + GLightbox]**：构建期 `getImage()` 解析图片 URL 注入 GLightbox `href`，比 `public/` 路径略复杂但获自动优化。
- **[Giscus 外部依赖]**：评论数据在 GitHub Discussions，Giscus 宕机不影响正文；配置缺失时显示占位不阻断构建。
- **[Obsidian 迁移契约]**：本 change 定 frontmatter schema，change 2 适配；契约记录在 Design Doc 第 3、10 节。

## 测试策略

- **框架**：Vitest + @vitest/coverage-v8
- **覆盖**：`src/lib/slug.ts`、`date.ts`、`gallery.ts`、`src/content/config.ts`
- **不测**：.astro 组件、CSS、客户端 JS（GLightbox/Giscus 交互）
- **CI**：build 前运行 `npm test -- --coverage`，失败阻断部署
- **覆盖率**：工具函数 80%+，.astro 从 glob 排除

## Spec Patch

已创建 4 个 delta spec（全部为新增 capability，非 patch 现有 spec）：
- `specs/content-publishing/spec.md`：6 requirements（内容集合、slug、TOC、RSS、sitemap、代码高亮）
- `specs/photo-gallery/spec.md`：5 requirements（相册集合、索引页、单相册 Lightbox、卡片流、首页区块）
- `specs/reader-comments/spec.md`：4 requirements（Giscus 集成、懒加载、路由映射、暗色模式）
- `specs/site-deployment/spec.md`：5 requirements（Actions 部署、构建前测试、权限、base path、SEO）

OpenSpec `validate` 通过，`isComplete: true`。

## Design Doc

已写入 `docs/superpowers/specs/2026-06-24-astro-blog-foundation-design.md`，frontmatter 最小化（comet_change/role/canonical_spec）。
