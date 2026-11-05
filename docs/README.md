# 文档总目录

[项目首页](../README.md) · [下载版本](https://github.com/zczxz3/modular-website-studio/releases/tag/v0.1.0-alpha.1) · [更新日志](../CHANGELOG.md)

先选择你的目标。**当前状态以 [功能现状](status.md) 为准，历史记录只证明其对应版本。**

## 我要使用工作台

| 目标 | 文档 |
| --- | --- |
| 第一次打开、做作品集、保存与交付 | [第一次做网站](guides/first-website.md) |
| 下载、启动、空目录或 Git 指针报错 | [下载与恢复](checkout-and-release.md) |
| 图片裁剪与渐变背景 | [图片和背景](p0-visual-tools.md) |
| 区块、多选、组合特效、批量素材 | [P1–P4 操作范围](p1-p4.md) |
| 查找和使用同账号的组件 | [31 个组件的分类与接入](resource-sync.md) |
| 判断某个能力现在能否用 | [当前状态与限制](status.md) |

## 我要开发或接组件

| 目标 | 文档 |
| --- | --- |
| 从代码结构和命令开始 | [开发导航](development/README.md) · [源码地图](../src/README.md) · [脚本说明](../scripts/README.md) |
| 理解源码、命令和隔离画布 | [架构](architecture.md) · [编辑行为与边界](development/editor-contract.md) |
| 实现工程或静态模块协议 | [文件格式](formats.md) · [可导入示例](../examples/README.md) |
| 理解两个仓库的分工与更新策略 | [仓库总览](repository-overview.md) · [资源契约](resource-sync.md) |
| 查询实际开源复用和授权 | [复用记录](open-source-reuse.md) |
| 选择下一轮工作 | [路线图](roadmap.md) · [贡献指南](../CONTRIBUTING.md) |

## 我要查看验收证据

当前发布基线的 CI 与打包信息集中在 [验证证据](status.md#验证证据)。以下按功能阶段保留，不把旧结果当成新版本测试。

| 记录 | 说明 |
| --- | --- |
| [新手完整流程](student-first-site-validation.md) | 姓名、封面、排序、特效和离线网站 |
| [界面打磨](interface-polish.md) | 截图、尺寸、正文编辑与定位 |
| [图片与渐变](p0-visual-tools.md#验证) | P0 的实际结果 |
| [P1–P4](p1-p4.md#验证记录) | 各阶段的实际结果 |
| [31 个组件](resource-sync.md#验证) | 跨页、样式隔离、工程重开和导出 |
| [分发检查](checkout-and-release.md#验证与版本) | 全新克隆和即用包 |
| [五人试用表](student-usability-check.md) | 待执行，不能等同于自动化通过 |

## 历史归档

以下只用于追溯早期设计与故障，不作为当前功能清单：

- [2026-11-04 开工时的仓库盘点](archive/2026-11-04-repository-audit.md)
- [编辑器最初基线](validation.md)
- [模块跨页修复](module-roundtrip-validation.md)
- [早期作品集](portfolio-validation.md)
- [拖动与单 HTML 导出](drag-html-validation.md)

新增操作说明放入 `guides/`，开发说明放入 `development/`，不再往 README 追加每轮执行日志。既有专题链接保留，避免已发布链接失效。
