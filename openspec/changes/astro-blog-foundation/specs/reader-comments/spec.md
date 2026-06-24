## ADDED Requirements

### Requirement: Giscus 评论集成

系统 SHALL 在文章与笔记详情页底部集成 Giscus 评论组件，基于 GitHub Discussions 承载评论数据。Giscus 配置 MUST 存储在 `src/lib/config.ts`，包含 `data-repo`、`data-repo-id`、`data-category`、`data-category-id`、`mapping`、`theme`、`reactionsEnabled`。

#### Scenario: 详情页加载评论
- **WHEN** 访问某文章或笔记详情页
- **THEN** 页面底部渲染 Giscus iframe，加载该路由对应的 GitHub Discussion 评论

#### Scenario: Giscus 配置缺失时构建不阻断
- **WHEN** `src/lib/config.ts` 中 Giscus 配置为空（占位值）
- **THEN** 构建成功，详情页显示"Giscus 未配置"占位提示，不阻断部署

### Requirement: 评论懒加载

Giscus 组件 SHALL 使用 `client:idle` 指令懒加载，避免阻塞页面首屏渲染。

#### Scenario: 评论在空闲时加载
- **WHEN** 用户打开详情页
- **THEN** 页面首屏内容（标题、正文）优先渲染，Giscus 在浏览器空闲时才加载

### Requirement: 评论与路由映射

Giscus `mapping` MUST 设为 `pathname`，每条文章/笔记路由对应一个独立的 GitHub Discussion 线程。

#### Scenario: 不同路由对应不同 Discussion
- **WHEN** 用户在文章 A 与文章 B 分别评论
- **THEN** 两篇文章的评论相互独立，存储在不同的 Discussion 中

### Requirement: 暗色模式适配

Giscus 主题 SHALL 跟随站点暗色模式切换（`data-theme="dark"` / `light`）。

#### Scenario: 暗色模式下评论主题切换
- **WHEN** 用户切换站点暗色模式
- **THEN** Giscus iframe 重新加载为对应主题（dark 或 light）
