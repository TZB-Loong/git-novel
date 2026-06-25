---
comet_change: astro-blog-foundation
role: technical-design
canonical_spec: openspec
archived-with: 2026-06-25-astro-blog-foundation
status: final
---

# Astro Blog Foundation — Technical Design

## 1. 概述

依托于 GitHub Pages 的个人博客，对外共享 Markdown 笔记、图片相册、图片笔记卡片流。技术栈 Astro 5 + Content Collections + TypeScript，通过 GitHub Actions 自动构建部署。OpenSpec 产物（proposal/design/tasks）是能力契约的事实源，本文档补充实现细节、测试策略与边界条件。

OpenSpec 4 个 capability 的 delta spec 位于 `openspec/changes/astro-blog-foundation/specs/*/spec.md`，本 Design Doc 不重复需求，仅描述 HOW。

## 2. 架构

静态站点，构建期渲染全部页面为静态 HTML，无服务端运行时。

```
src/
  content/
    config.ts              # 集合 schema（articles/notes/albums）
    articles/              # 长文章 .md
    notes/                 # 短笔记 .md（可含 cover）
    albums/                # 相册元数据 .md
  pages/
    index.astro            # 首页
    articles/index.astro
    articles/[...slug].astro
    notes/index.astro
    notes/[...slug].astro
    gallery/index.astro
    gallery/[album].astro
    rss.xml.ts
  components/
    BaseLayout.astro
    BaseHead.astro
    Header.astro
    Footer.astro
    Lightbox.astro
    Giscus.astro
    NoteCard.astro
    ArticleCard.astro
    TOC.astro
  layouts/
    BaseLayout.astro
  lib/
    slug.ts                # 中文 → pinyin slug
    date.ts                # 日期格式化
    gallery.ts             # 相册图片收集
    config.ts              # 站点配置（site、base、giscus 等）
  assets/
    gallery/<album>/       # 相册原图
    notes/                 # 笔记封面
  styles/
    global.css             # CSS 变量、暗色模式
public/
  favicon.svg
astro.config.ts
tsconfig.json
vitest.config.ts
.github/workflows/deploy.yml
```

## 3. 内容集合 Schema

`src/content/config.ts` 定义三个集合，frontmatter 契约固定，为 change 2（obsidian-migration）提供稳定接口。

### articles
- `title: string`（必填）
- `pubDate: date`（必填，ISO 8601）
- `updateDate?: date`
- `description: string`（必填）
- `tags?: string[]`
- `category?: string`
- `draft?: boolean`（默认 false）

### notes
- `title: string`（必填）
- `pubDate: date`（必填）
- `cover?: string`（相对 `src/assets/` 的路径）
- `tags?: string[]`
- `draft?: boolean`

### albums
- `title: string`（必填）
- `date: date`（必填）
- `cover?: string`
- `description?: string`
- `images: string[]`（必填，相对 `src/assets/gallery/<album>/` 的图片文件名列表）

**slug 策略**：由文件名生成；中文文件名通过 `slug.ts` 转 pinyin（用 `pinyin-pro` 库）；重复 slug 构建期报错。

## 4. 路由与渲染

| 路由 | 渲染逻辑 |
|------|---------|
| `/` | 最新 5 篇 articles + 最近 6 条含 cover 的 notes 卡片 |
| `/articles/` | 全部 articles 按 pubDate 倒序，支持 `?tag=` `?category=` 查询筛选 |
| `/articles/[...slug]` | 文章详情 + TOC（h2/h3）+ 上下篇 + Giscus |
| `/notes/` | 含 cover 的 notes 卡片网格，按 pubDate 倒序 |
| `/notes/[...slug]` | 笔记详情 + Giscus |
| `/gallery/` | 全部 albums 索引（封面 + 标题 + 日期） |
| `/gallery/[album]` | 单相册 CSS Grid + GLightbox |
| `/rss.xml` | @astrojs/rss，最近 20 篇 articles |
| `/sitemap-index.xml` | @astrojs/sitemap 自动生成 |

**base path 处理**：`base='/git-novel'`。内部链接统一用 `import.meta.env.BASE_URL` 前缀；canonical 与 OG 用 `new URL(path, Astro.site)` 拼接绝对 URL。

**draft 处理**：`import.meta.env.PROD` 时过滤 `draft: true`，dev 模式可见。

## 5. 图片处理

- 统一存 `src/assets/`（相册 `src/assets/gallery/<album>/`，笔记封面 `src/assets/notes/`）
- Markdown 内图片用相对路径，Astro 自动优化为 WebP/AVIF 响应式
- 相册页用 `<Image>` 组件生成缩略图，同时 `getImage()` 获取完整图 URL 注入 GLightbox `href` 属性
- 单图限制 < 2MB，构建期不压缩原图（Astro 自动生成缩略图）

## 6. 组件

- **BaseLayout/BaseHead**：HTML 骨架 + meta + SEO + OG + canonical + RSS link
- **Header**：导航（首页/文章/笔记/相册），当前页高亮
- **Footer**：版权 + RSS + GitHub 链接
- **Lightbox**：GLightbox 客户端 JS，仅相册页 `client:load` 注入
- **Giscus**：React 包裹，`client:idle` 懒加载，仅详情页
- **NoteCard**：封面缩略图 + 标题 + 日期
- **ArticleCard**：标题 + 日期 + description
- **TOC**：从 `Astro.props.headings` 生成 h2/h3 两级

## 7. CI/CD

`.github/workflows/deploy.yml`：
- 触发：push to main + workflow_dispatch
- 权限：contents: read, pages: write, id-token: write
- 构建：`withastro/action@v3`，Node 20
- 部署：`actions/deploy-pages@v4`，environment: github-pages
- 测试：build 前 `npm ci && npm test -- --coverage`

**一次性手动配置**：
1. 仓库 Settings → Pages → Source: GitHub Actions
2. 仓库 Settings → 启用 Discussions
3. 安装 Giscus App，访问 giscus.app 生成 `data-repo-id`、`data-category-id`
4. 配置写入 `src/lib/config.ts`

## 8. 测试策略

- **框架**：Vitest + @vitest/coverage-v8
- **范围**：
  - `src/lib/slug.ts`：中文/特殊字符/重复 slug 处理
  - `src/lib/date.ts`：ISO 解析、格式化、时区
  - `src/content/config.ts`：schema 校验（必填、类型、draft 默认值）
  - `src/lib/gallery.ts`：相册图片收集与排序
- **不测**：.astro 组件渲染、CSS、客户端 JS（GLightbox/Giscus 交互）
- **覆盖率**：工具函数 80%+；`.astro` 组件从 coverage glob 排除（豁免声明）
- **CI**：build 前运行，失败阻断部署

**豁免说明**：静态站点 UI 层（.astro 组件）的渲染正确性靠 `npm run build` + 本地预览 + 生产环境验证，不纳入单测覆盖率。这是静态站点特性决定的合理豁免。

## 9. 关键取舍与风险

- **[base=/git-novel]**：所有内部链接需带 base 前缀；接自定义域名时需改 base 为空并重建。
- **[Vitest 覆盖范围有限]**：UI 层豁免单测，全局覆盖率可能低于 80% 阈值——已在 design 声明豁免范围。
- **[src/assets 图片 + GLightbox]**：需在构建期通过 `getImage()` 解析图片输出 URL 注入 GLightbox data 属性，比 `public/` 固定路径略复杂，但获得自动优化。
- **[Giscus 依赖外部服务]**：评论数据在 GitHub Discussions，不在本仓库；Giscus 服务宕机时评论不可见，不影响正文。
- **[Astro 5 破坏性变更]**：锁定 `astro@^5`，CI 用 lockfile 保证可复现。
- **[Obsidian 迁移契约]**：本 change 定义 frontmatter schema，change 2 负责适配；schema 变更需双方协调，已通过 tasks 9.6 记录契约。

## 10. 与 change 2 的边界

本 change 交付：
- 稳定的 frontmatter schema（`src/content/config.ts`）
- slug 生成规则（中文 → pinyin）
- 图片路径约定（`src/assets/` 相对路径）
- 内容集合查询接口

change 2（obsidian-migration）负责：
- Obsidian wikilink `[[note]]` → Markdown 链接转换
- Obsidian 附件 `![[image.png]]` → `![](../../assets/notes/image.png)` 路径映射
- Obsidian frontmatter（`tags`、`aliases`、`publish`）→ 本项目 schema 适配
- 迁移脚本与验证

## 11. 开放问题

- GitHub 用户名（填 `astro.config.ts` 的 `site`）需用户在 build 前提供
- Giscus category 选择（Announcements vs General）在配置时由用户决定
- 自定义 404 页面首期不做（用 GitHub Pages 默认）
