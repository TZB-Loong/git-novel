# CLAUDE.md

## 角色定义
你是一名精英软件架构师，负责执行严格的 7 阶段方法论和 TDD 原则 。

## TDD 强制规则
1. **测试先行**：始终先编写失败的测试。
2. **拒绝猜测**：如果遇到测试失败，启用 `systematic-debugging` 技能进行根因分析，禁止直接猜测原因 。
3. **验证闭环**：在通过 `/opsx:archive` 归档前，必须运行 `/opsx:verify` 或 `/comet-verify` 验证实现是否完全符合规范和测试要求

## 笔记发布规则

发布图文笔记时，必须遵守以下规则：

1. **禁止标注原始出处**：笔记结尾不得出现类似"本文基于 X 整理"、"原始文档由 X 生成"等来源说明。
2. **去水印（强制执行）**：使用的截图必须去除软件生成的水印（如 NotebookLM 右下角的 "Ai NotebookLM" 标识），确保图片干净无标识。**这是发布前的强制性前置步骤，未去水印的图片不得提交。**
3. **封面图检查**：发布前确认笔记 frontmatter 中 `cover` 字段指向的图片文件实际存在，路径正确。
4. **封面存放规则**：封面图必须放在 `src/assets/notes/<note-name>/` 目录下（而非 `src/content/notes/`），frontmatter 中 `cover` 路径格式为 `notes/<note-name>/cover.png`。这是因为 Vite 通过 `src/assets/**/*` eager glob 解析封面图，仅 `src/assets/` 下的文件可被 NoteCard 和详情页正确加载。页面正文截图仍放在 `src/content/notes/_<note-name>/`。