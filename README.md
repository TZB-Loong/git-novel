# git-novel

基于 Astro 5 的个人博客，部署在 GitHub Pages。支持 Markdown 文章、图片笔记卡片流、图片相册。

## 本地开发

```bash
npm install
npm run dev      # http://localhost:4321/git-novel/
npm run build    # 输出到 dist/
npm run preview  # 预览构建结果
npm test         # 运行 Vitest 单测
npm run test:coverage
```

## 添加内容

### 文章

在 `src/content/articles/` 新建 `.md` 文件：

```yaml
---
title: 文章标题
pubDate: 2024-03-15
description: 一句话描述
tags: [标签1, 标签2]
category: 分类
draft: false
---

正文（Markdown）...
```

### 笔记

在 `src/content/notes/` 新建 `.md` 文件。带 `cover` 字段的笔记会出现在首页与 `/notes/` 卡片流：

```yaml
---
title: 笔记标题
pubDate: 2024-03-20
cover: notes/my-cover.jpg   # 相对 src/assets/ 的路径
---

正文...
```

封面图片放在 `src/assets/notes/`。

### 相册

在 `src/content/albums/` 新建 `.md` 文件，图片放在 `src/assets/gallery/<album-slug>/`：

```yaml
---
title: 相册标题
date: 2024-03-22
description: 可选描述
images: [1.jpg, 2.jpg, 3.jpg]   # 相对 src/assets/gallery/<album-slug>/ 的文件名
---
```

## 部署

1. 在 GitHub 仓库 Settings → Pages → Source 选择 "GitHub Actions"。
2. 启用 Discussions（Settings → General → Features → Discussions）。
3. 在 `astro.config.ts` 中把 `site` 的 `username` 替换为真实 GitHub 用户名。
4. （可选）配置 Giscus：
   - 访问 https://giscus.app，填入仓库信息生成 `data-repo-id` 与 `data-category-id`。
   - 把得到的值填入 `src/lib/config.ts` 的 `rawGiscus` 对象。
5. 推送 main 分支，GitHub Actions 自动构建部署到 `https://<username>.github.io/git-novel/`。

## 测试

- Vitest 覆盖 `src/lib/*.ts` 与 `src/content/config.ts`，覆盖率 ≥ 80%。
- `.astro` 组件不在单测范围（静态站点 UI 层豁免），通过 `npm run build` 验证。
- CI 在 build 前运行 `npm test -- --coverage`，失败阻断部署。

## 目录结构

见 `docs/superpowers/specs/2026-06-24-astro-blog-foundation-design.md` 第 2 节。

## Schema 契约

frontmatter schema 是 change 2（obsidian-migration）的稳定接口，详见 `docs/superpowers/specs/astro-blog-foundation-schema-contract.md`。修改 schema 需双方协调。
