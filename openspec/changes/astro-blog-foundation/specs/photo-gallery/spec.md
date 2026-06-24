## ADDED Requirements

### Requirement: 相册集合

系统 SHALL 通过 `albums` 内容集合管理相册元数据。frontmatter MUST 包含：`title`(string,必填)、`date`(date,必填)、`images`(string[],必填)；可选：`cover`(string)、`description`(string)。

`images` 数组中的路径 MUST 相对 `src/assets/gallery/<album-slug>/` 目录。

#### Scenario: 相册元数据校验
- **WHEN** 相册 frontmatter 包含必填字段且 `images` 非空
- **THEN** 相册出现在相册索引页，构建成功

#### Scenario: images 为空构建失败
- **WHEN** 相册 `images` 为空数组或缺失
- **THEN** `npm run build` 报错

### Requirement: 相册索引页

系统 SHALL 在 `/gallery/` 提供相册索引页，列出全部相册（按 date 倒序），每个相册显示封面、标题、日期。

#### Scenario: 相册索引列出全部相册
- **WHEN** 访问 `/git-novel/gallery/`
- **THEN** 页面显示所有相册卡片，每张卡片含封面缩略图、标题、日期，按 date 倒序排列

### Requirement: 单相册页与 Lightbox

系统 SHALL 在 `/gallery/[album]` 提供单相册页，以 CSS Grid 网格布局展示所有图片；点击图片 SHALL 打开 GLightbox 全屏放大，支持键盘左右切换与 ESC 关闭。

#### Scenario: 相册网格布局展示
- **WHEN** 访问某相册页
- **THEN** 所有图片以网格排列，每张图片显示为缩略图（Astro 自动生成的 WebP/AVIF）

#### Scenario: 点击图片打开 Lightbox
- **WHEN** 用户点击相册中的某张图片
- **THEN** GLightbox 打开该图片全尺寸版本，支持左右箭头切换上一张/下一张，ESC 关闭

#### Scenario: 图片自动优化
- **WHEN** 相册原图为 PNG/JPEG
- **THEN** 构建期通过 `astro:assets` 生成 WebP/AVIF 响应式缩略图，HTML 中 `<img>` 使用 `srcset`

### Requirement: 图片笔记卡片流

系统 SHALL 在 `/notes/` 提供图片笔记卡片流，展示所有含 `cover` 字段的 notes，按 pubDate 倒序排列为卡片网格。每张卡片 MUST 显示封面缩略图、标题、日期。

#### Scenario: 卡片流仅显示含封面的笔记
- **WHEN** 访问 `/git-novel/notes/`
- **THEN** 页面显示所有 `cover` 字段非空的 notes 卡片，按 pubDate 倒序；无 cover 的笔记不出现

#### Scenario: 卡片点击跳转详情
- **WHEN** 用户点击某张笔记卡片
- **THEN** 跳转到该笔记详情页 `/git-novel/notes/<slug>/`

### Requirement: 首页图片笔记区块

系统 SHALL 在首页 `/` 展示最近 6 条含 cover 的 notes 卡片。

#### Scenario: 首页展示最近图片笔记
- **WHEN** 访问 `/git-novel/`
- **THEN** 首页包含"图片笔记"区块，显示最近 6 条含 cover 的 notes 卡片，点击跳转对应详情页
