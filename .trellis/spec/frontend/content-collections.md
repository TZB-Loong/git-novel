# Content Collections

> 项目内容集合规范，基于 `src/content/config.ts` 与 `src/lib/slug.ts` 的真实实现。

## 当前状态

`src/content/config.ts` 当前只注册 `notes` 集合。`src/content/articles/` 与
`src/content/albums/` 目录已存在，但对应集合与路由尚未接线（目标状态见
`.trellis/legacy/specs/`）。

## notes 集合

frontmatter schema（`notesSchema`）：

- `title`: string，必填
- `pubDate`: date，必填（`z.coerce.date()` 接受字符串）
- `cover`: string，可选，封面路径
- `tags`: string[]，可选
- `draft`: boolean，可选，默认 false

## Slug 生成

- 集合 entry id 由 `generateId` 委托给 `toSlug`（`src/lib/slug.ts`）。
- 中文文件名转无调 pinyin，空格/下划线转连字符，其余非 ASCII 字符剥离。
- 纯非 ASCII 非中文输入（如 emoji）退化为 `post-<hash>`，slug 永不为空。
- 构建期用 `assertUniqueSlugs` 对重复 slug 抛错并列出冲突文件。

## Draft 处理

- `draft: true` 且 `import.meta.env.PROD` 时，文章/笔记从列表与 RSS 中隐藏。
- `import.meta.env.DEV` 时开发服务器可见。

## 资产约定

- 笔记封面：`src/assets/notes/<slug>/cover.png`。
- 正文配图：`src/content/notes/_<slug>/NN-name.png`，Markdown 中相对引用。
- 相册图片（目标状态）：`src/assets/gallery/<album-slug>/`。

## 测试

- `src/content/config.test.ts`：schema 校验与 `generateId`。
- `src/lib/slug.test.ts`：pinyin 转换、冲突检测、emoji 退化。
- `src/lib/date.test.ts`：日期格式化与排序。
