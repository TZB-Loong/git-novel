# Components and Pages

> 组件与页面规范，基于 `src/components/` 与 `src/pages/` 的真实实现。

## 组件清单

| 组件 | 职责 |
|------|------|
| `BaseHead.astro` | SEO 元信息：canonical、`og:*`、`twitter:card`、favicon |
| `Header.astro` | 站点导航 |
| `Footer.astro` | 页脚 |
| `NoteCard.astro` | 图片笔记卡片（封面、标题、日期） |
| `Lightbox.astro` | GLightbox 全屏看图，键盘左右切换、ESC 关闭 |
| `Giscus.tsx` / `Giscus.astro` | GitHub Discussions 评论，`mapping=pathname` |

## 页面结构

- `src/pages/index.astro`：首页，含最近 6 条带 cover 的 notes 卡片区块。
- `src/pages/notes/index.astro`：笔记卡片流，按 pubDate 倒序，只显示 `cover`
  非空的笔记。
- `src/pages/notes/[...slug].astro`：笔记详情，TOC（h2/h3）+ 上一篇/下一篇导航
  （`src/lib/date.ts` 的 `prevNextByDate`）。

## 约定

- React island 只有 `Giscus.tsx` 一个，通过 `client:idle` 懒加载，避免阻塞首屏。
- Giscus 配置集中放 `src/lib/config.ts`，含 `data-repo`、`data-category` 等；
  配置为空占位时不阻断构建。
- 图片经 `astro:assets` 构建期生成 WebP/AVIF 响应式缩略图，`<img>` 使用
  `srcset`。
- 暗色模式：Giscus 主题与站点 `data-theme` 联动。

## 未实现目标

`src/pages/gallery/` 与 `src/pages/articles/` 目录已建但无路由文件；相册索引页、
单相册页与 Lightbox 网格、文章集合页面按 `.trellis/legacy/specs/` 的目标状态补齐。
