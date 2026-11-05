# 贡献指南

先阅读 [开发导航](docs/development/README.md)、[源码地图](src/README.md) 和 [当前功能边界](docs/status.md)。问题反馈请说明真实编辑场景、预期源码变化和最小输入工程；修复应提供失败示例及有意义的回归验证。导入第三方素材前确认许可证允许分发。

使用 Node.js 22.12+，执行 `npm ci`、`npm run check` 和 `npm run build`。涉及画布、导入导出或 Monaco 时，安装 Chromium 后执行 `npm run test:e2e`。纯文档修改检查链接与内容即可，不要把没有执行的测试写为通过。PR 说明实际行为变化、验证结果和兼容性限制。

解析与命令逻辑保持独立于 React，全部持久化视觉修改通过现有命令和事务。编辑 iframe 不执行作品脚本；预览与导出的行为需验证一致。新增动效和未来 3D 模块还须覆盖资源清理。

文档按 [总目录](docs/README.md) 组织：操作说明放入 `docs/guides/`，开发参考放入 `docs/development/`，旧版本盘点放入 `docs/archive/`；当前状态、路线图和更新日志分别维护，避免把每轮执行记录混入项目首页。关键工程规则见 [AGENTS.md](AGENTS.md)。
