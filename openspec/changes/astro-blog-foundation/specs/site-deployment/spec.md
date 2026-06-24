## ADDED Requirements

### Requirement: GitHub Actions 自动部署

系统 SHALL 通过 `.github/workflows/deploy.yml` 在 main 分支推送时自动构建并部署到 GitHub Pages。workflow MUST 使用 `withastro/action@v3` 构建站点，使用 `actions/deploy-pages@v4` 部署产物。

#### Scenario: 推送 main 触发部署
- **WHEN** 向 main 分支推送 commit
- **THEN** GitHub Actions 触发 deploy workflow，构建成功后站点更新到 GitHub Pages

#### Scenario: 手动触发部署
- **WHEN** 在 GitHub Actions UI 手动运行 workflow_dispatch
- **THEN** workflow 执行构建与部署

### Requirement: 构建前测试

deploy workflow MUST 在构建前运行 `npm test -- --coverage`，测试失败时阻断部署。

#### Scenario: 测试失败阻断部署
- **WHEN** `npm test` 退出码非 0
- **THEN** workflow 在测试步骤失败，不执行 build 与 deploy，GitHub Pages 保持上次成功部署

#### Scenario: 测试通过继续部署
- **WHEN** `npm test` 退出码为 0
- **THEN** workflow 继续 `npm run build` 与部署

### Requirement: Pages 权限配置

deploy workflow MUST 声明 `permissions: contents: read, pages: write, id-token: write`，部署 job MUST 使用 `environment: github-pages`。

#### Scenario: 权限正确配置
- **WHEN** workflow 运行
- **THEN** deploy job 在 github-pages environment 下执行，具有写入 Pages 的权限

### Requirement: base path 配置

`astro.config.ts` MUST 配置 `site` 为完整 GitHub Pages URL（`https://<user>.github.io`），`base` 为 `/git-novel`，以匹配项目仓库的 Pages 路径。

#### Scenario: 内部链接带 base 前缀
- **WHEN** 站点部署到 `https://<user>.github.io/git-novel/`
- **THEN** 所有内部链接、静态资源、RSS、sitemap 路径均以 `/git-novel/` 为前缀，无 404

#### Scenario: canonical 与 OG 输出绝对 URL
- **WHEN** 访问任意页面
- **THEN** `<link rel="canonical">` 与 Open Graph `og:url` 输出 `https://<user>.github.io/git-novel/<path>` 绝对 URL

### Requirement: SEO 元信息

系统 SHALL 为每个页面生成 SEO 元信息：`<title>`、`<meta name="description">`、Open Graph（`og:title`、`og:description`、`og:url`、`og:type`）、Twitter Card。

#### Scenario: 文章页 SEO 元信息
- **WHEN** 访问某文章详情页
- **THEN** HTML `<head>` 包含文章 title 作为 `<title>`，frontmatter `description` 作为 meta description，OG 标签完整

#### Scenario: 首页 SEO 元信息
- **WHEN** 访问 `/git-novel/`
- **THEN** `<head>` 包含站点标题、站点描述、OG 标签
