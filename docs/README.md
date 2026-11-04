# 文档导航

| 你想了解什么 | 从这里开始 |
| --- | --- |
| 克隆后目录为空、Git 指针失效、怎样完整下载和启动 | [下载与克隆修复](checkout-and-release.md) |
| 同账号的 31 个组件如何添加、保存和导出 | [website-assets 组件库](resource-sync.md) |
| 精选区块、多选变换、组合动效与批量素材 | [P1–P4 集成与验收](p1-p4.md) |
| 图片裁剪与渐变背景如何使用、保存和导出 | [P0 可视化工具](p0-visual-tools.md) |
| 新界面、组件搜索、属性分组与浏览器验收 | [工作台界面打磨](interface-polish.md) |
| 参考了哪些项目，实际复用了什么代码 | [开源复用与 AOS 配置链路](open-source-reuse.md) |
| 两个仓库各做什么、代码在哪个分支、哪些资源能用 | [仓库整理与版本矩阵](repository-overview.md) |
| 第一次做作品集的完整流程、本轮实际检查 | [学生首个网站验收](student-first-site-validation.md) |
| 找五位同学试用时怎样记录问题 | [五人可用性验收](student-usability-check.md) |
| 接口、源码写回、拖动和编辑隔离 | [架构](architecture.md) |
| 工程、模块、图片和导出保存了什么 | [文件格式](formats.md) |
| 素材仓库怎样固定版本、保留更新接口 | [资源接口与来源](resource-sync.md) |
| 已实现与未来目标 | [路线图](roadmap.md) |

实现位置：`src/components/` 是工作台界面，`src/core/` 是源码命令和项目逻辑，`src/preview/` 是隔离画布与受控效果，`src/templates/` 是完整页面模板，`src/resources/` 是固定本地示例。`tests/` 验证源码与运行逻辑，`e2e/` 验证真实浏览器操作和下载文件。

历史验收保留原版本边界：[编辑器基线](validation.md)、[模块跨页修复](module-roundtrip-validation.md)、[早期作品集](portfolio-validation.md)、[拖动与单 HTML](drag-html-validation.md)。这些记录中的旧测试结果不代表后续提交自动通过。
