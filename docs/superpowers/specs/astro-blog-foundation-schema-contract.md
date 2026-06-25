# Astro Blog Foundation — Frontmatter Schema Contract

> 本文档是 change `astro-blog-foundation` 与 change `obsidian-migration`（待开）之间的契约。
> 修改 schema 必须同步更新本文件并通知 change 2 负责人。

## 数据源

- 定义位置：`src/content/config.ts`
- 校验方式：zod schema（Astro Content Collections）
- 构建期：schema 校验失败 → `npm run build` 报错

## articles 集合

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| title | string | 是 | — | 文章标题 |
| pubDate | date (ISO 8601) | 是 | — | 发布日期 |
| updateDate | date | 否 | — | 更新日期 |
| description | string | 是 | — | 一句话描述，用于列表与 SEO |
| tags | string[] | 否 | — | 标签数组 |
| category | string | 否 | — | 分类 |
| draft | boolean | 否 | false | 生产环境隐藏 |

文件位置：`src/content/articles/<slug>.md`
Slug 生成：文件名经 `toSlug()` 转 pinyin；重复 slug 构建期报错。

## notes 集合

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| title | string | 是 | — | 笔记标题 |
| pubDate | date | 是 | — | 发布日期 |
| cover | string | 否 | — | 相对 `src/assets/` 的路径；存在时进入卡片流 |
| tags | string[] | 否 | — | 标签 |
| draft | boolean | 否 | false | 生产环境隐藏 |

文件位置：`src/content/notes/<slug>.md`
无 `cover` 的笔记仅出现在详情路由，不出现在 `/notes/` 卡片流与首页区块。

## albums 集合

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| title | string | 是 | — | 相册标题 |
| date | date | 是 | — | 相册日期 |
| cover | string | 否 | — | 相对 `src/assets/` 的路径；缺省用第一张图 |
| description | string | 否 | — | 相册描述 |
| images | string[] | 否（但必须非空） | — | 相对 `src/assets/gallery/<album-slug>/` 的文件名列表 |

文件位置：`src/content/albums/<slug>.md`
图片文件位置：`src/assets/gallery/<album-slug>/<filename>`
`images` 数组必须非空，否则构建失败。

## 图片路径约定

- 笔记封面：`src/assets/notes/<filename>` → frontmatter `cover: notes/<filename>`
- 相册图片：`src/assets/gallery/<album-slug>/<filename>` → frontmatter `images: [<filename>, ...]`
- 文章内图片：Markdown 相对路径，Astro 自动优化

## Slug 规则

- 由文件名（去扩展名）经 `toSlug()` 生成
- 中文字符 → pinyin（无音调，连字符分隔）
- 空格、下划线 → 连字符
- 连续连字符合并，首尾连字符去除
- 重复 slug 构建期报错（`assertUniqueSlugs`）

## change 2 (obsidian-migration) 责任范围

- Obsidian wikilink `[[note]]` → Markdown 链接
- Obsidian 附件 `![[image.png]]` → `![](../../assets/notes/image.png)` 路径映射
- Obsidian frontmatter（`tags`、`aliases`、`publish`）→ 本项目 schema 适配
- 迁移脚本与验证

## 变更流程

1. 修改 `src/content/config.ts` 与对应 zod schema 导出
2. 更新本契约文档
3. 同步更新 `src/content/config.test.ts` 测试
4. 运行 `npm test` 与 `npm run build` 验证
5. 通知 change 2 负责人评估迁移脚本影响
