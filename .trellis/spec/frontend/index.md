# Frontend Development Guidelines

> Astro 5 + TypeScript 静态博客（git-novel）的前端约定。

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Content Collections](./content-collections.md) | notes 集合、slug、draft 与资产约定 | 已填充 |
| [Components and Pages](./components-and-pages.md) | 组件、页面、图片管线与评论 | 已填充 |
| [Directory Structure](./directory-structure.md) | 模块组织与文件布局 | 模板占位 |
| [Component Guidelines](./component-guidelines.md) | 组件模式与 props | 模板占位 |
| [Hook Guidelines](./hook-guidelines.md) | 数据获取模式 | 模板占位 |
| [State Management](./state-management.md) | 状态管理 | 模板占位 |
| [Quality Guidelines](./quality-guidelines.md) | 代码标准 | 模板占位 |
| [Type Safety](./type-safety.md) | 类型与校验模式 | 模板占位 |

## 约定

- 语言：TypeScript；内容集合 schema 用 `zod`（`astro:content`）。
- 中文文件名 slug 走 `src/lib/slug.ts` 的 pinyin 转换，构建期检测重复。
- React island 最小化：目前只有 Giscus 一个。
- 测试与源码同目录（`*.test.ts`），用 vitest。
