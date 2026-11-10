---
name: git-novel-blogger
description: 专门用于维护 /Volumes/ssd/git-novel 博客的撰写、编排、图文配置、构建与发布工作流。当用户要求写博客、整理图文笔记、生成封面插图或更新博客内容时使用。
---

# Git Novel 博客写作与维护指南

本技能专门用于维护位于 `/Volumes/ssd/git-novel` 的 Astro 5 个人图文笔记博客。

## 1. 项目基础与核心路径
- **仓库根目录**：`/Volumes/ssd/git-novel`
- **文章目录**：`/Volumes/ssd/git-novel/src/content/notes/`
- **正文插图目录**：`/Volumes/ssd/git-novel/src/content/notes/_<slug>/`
- **封面图片目录**：`/Volumes/ssd/git-novel/src/assets/notes/<slug>/`
- **配置文件**：`src/content/config.ts`、`astro.config.ts`

## 2. 博文规范与 Frontmatter
新建文章保存为 `/Volumes/ssd/git-novel/src/content/notes/<slug>.md`。
必须遵循以下 Frontmatter 格式：

```yaml
---
title: 文章标题
pubDate: 2026-11-09
cover: notes/<slug>/cover.png # 相对 src/assets/ 的路径，带 cover 的文章会进入首页卡片流
tags: [标签1, 标签2]
draft: false
---
```

## 3. 配图与资源规范（图文并茂底线）
- **封面图**：
  - 存放于 `src/assets/notes/<slug>/cover.png`（支持 png/jpg/webp/svg）。
  - Frontmatter 字段填 `notes/<slug>/cover.png`。
- **正文插图（必须图文并茂）**：
  - 文章绝不能只有一张单薄的总览图，必须随章节推进穿插多张直观插图（系统架构图、AST语法拦截流、时序状态机、Token/算力对比图、实测曲线等）。
  - 存放于 `src/content/notes/_<slug>/`（下划线开头的子目录）。
  - Markdown 中相对引用：`![说明文字](./_<slug>/<name>.svg)`。
  - SVG 图表要求采用现代工程美学配色（深色/浅色高对比适配、圆角容器、优雅阴影与字体层次）。

## 4. 博客写作风格与排版
- **开篇导言**：使用引用块（`> ...`）提炼全文核心要点与背景。
- **结构化编排**：合理使用二级和三级标题（`## 一、...`、`### 1.1 ...`），逻辑层层递进。
- **视觉化与图文结合**：文字、代码、数据表与直观矢量插图（SVG/流程图）紧密呼应，图文并茂拆解硬核技术机理。
- **代码与公式**：代码块标明语言；数学公式使用标准 LaTeX 语法。
- **总结反思**：文末提供实战建议、技术权衡或演进思考。

## 5. 验证与构建工作流
在添加或修改博文后执行验证：
1. **单测检查**：`npm --prefix /Volumes/ssd/git-novel test`
2. **构建检查**：`npm --prefix /Volumes/ssd/git-novel run build`
3. **版本管理**：
   - 提交信息规范（如 `content: add <title>` 或 `style: enhance illustrations`）。
   - 注意：对外推送（`git push`）、删除重要文件或花钱操作，必须经 loong 拍板。
