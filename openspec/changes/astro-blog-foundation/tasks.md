## 1. 项目初始化

- [x] 1.1 在仓库根目录 `git init`，配置 `.gitignore`（node_modules、dist、.astro、.DS_Store）
- [x] 1.2 初始化 Astro 5 项目（`npm create astro@latest`，选 Empty + TypeScript strict）
- [x] 1.3 配置 `astro.config.ts`（`site`、`base`、`integrations: [mdx, sitemap]`）
- [x] 1.4 配置 `tsconfig.json` strict 模式
- [x] 1.5 安装核心依赖：`@astrojs/rss`、`@astrojs/sitemap`、`@astrojs/mdx`

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
