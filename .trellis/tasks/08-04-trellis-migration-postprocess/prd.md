# OpenSpec 迁移 Trellis 收尾与验证

## Goal

完成 Comet/OpenSpec 到 Trellis 的迁移收尾：把项目级规范沉淀到
`.trellis/spec/`，修正转换产物，并跑通一轮 Trellis 工作流闭环
（Plan → Implement → Verify → Finish）。

## Background

- 项目已安装 Trellis 0.6.12（`trellis init -u loong --codex --claude`）。
- transpec 已完成 OpenSpec → Trellis 转换：4 个 spec 归档到
  `.trellis/legacy/specs/`，原 change 转为归档任务
  `.trellis/tasks/archive/2026-06/06-25-astro-blog-foundation/`。
- Trellis 模板 spec 仍是占位符，需要按真实代码库补充。

## Requirements

1. 在 `.trellis/spec/frontend/` 补充内容集合规范：articles/notes/albums
   frontmatter schema、中文文件名转 pinyin slug、draft 处理。
2. 在 `.trellis/spec/frontend/` 补充组件与页面规范：组件清单、图片管线、
   GLightbox、Giscus 评论。
3. 在 `.trellis/spec/guides/` 补充部署与发布规范：GitHub Actions 流水线、
   base path、SEO 元信息、RSS/sitemap。
4. 修正 `.trellis/spec/backend/python-cli-runtime.md` 的主语言误判：
   项目以 TypeScript/Astro 为主，Python 仅用于 `scripts/xiaohei_gen.py`。
5. 更新 spec 索引与 `.trellis/spec/guides/repository-and-conversion-state.md`。

## Acceptance Criteria

- [ ] `frontend/content-collections.md` 描述三个内容集合的 schema 与 slug/draft 约定。
- [ ] `frontend/components-and-pages.md` 描述组件、页面与图片管线。
- [ ] `guides/deployment-and-publishing.md` 描述部署、SEO、RSS/sitemap 约定。
- [ ] `backend/python-cli-runtime.md` 主语言标注为 TypeScript/Astro。
- [ ] `npm test` 通过。
- [ ] `npm run build` 通过。
- [ ] `transpec validate` 对转换实体无新增错误（bootstrap 占位任务的已知错误除外）。

## Notes

- 转换产物已由 `transpec apply` 生成，本任务只做 postprocess 收尾。
- `.agents/skills/stop-slop/` 保持不提交。
