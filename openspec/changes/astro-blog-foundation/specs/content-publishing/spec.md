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
