# 当前功能与发布状态

更新日期：2026-11-05（UTC+8）。[项目首页](../README.md) · [新手指南](guides/first-website.md) · [路线图](roadmap.md)

当前为 **0.1.0 alpha**，本次集中发行标记为 **v0.1.0-alpha.2**。主要创作功能已在主分支，使用版由静态网页和本地 Node 服务组成；尚无原生安装器和在线创作地址。

## 已可使用

| 类别 | 当前范围 | 实现入口 |
| --- | --- | --- |
| 模板 | 中文四页作品集、空白作品、源码示例；姓名、两张封面与作品排序 | `src/templates/`、`src/core/catalog.ts` |
| 内容与样式 | 文字、属性、颜色、背景、渐变、尺寸、间距、圆角；图片上传/裁剪 | `src/components/`、`src/core/commands.ts` |
| 组件与区块 | 31 个 website-assets 原版模块 + 7 个工作台组件 + 3 个区块，共 41 个目录项 | `src/resources/`、`src/core/catalog.ts`；支持集合 ZIP 导入与原生展架 |
| 画布 | 结构排序与嵌套、自由移动/尺寸调整、多选变换/旋转/吸附、同父级左/顶对齐 | `src/preview/`、`src/components/Canvas.tsx` |
| 特效 | CSS 悬停/外观、AOS 滚动配置、AnimXYZ 的 3 组组合预设 | `src/core/aos.ts`、`xyz.ts`、`effects.ts` |
| 素材 | 本地批量图片、去重、搜索、替换、引用检查和删除 | `src/core/assets.ts`、`src/components/AssetLibrary.tsx` |
| 保存 | 延迟自动草稿、显式保存、可移植工程 JSON、多页资源保留 | `src/core/recent.ts`、`io.ts` |
| 导出 | 全站 ZIP、受支持的当前单页 HTML，本地资源与相应授权一并导出 | `src/core/io.ts`、`export-html.ts` |
| 开发 | HTML/CSS 源码双向编辑、Monaco、诊断、事务与撤销重做 | `src/core/`、`src/components/CodeEditor.tsx` |
| 分发 | 源码 ZIP、即用网页 ZIP、启动脚本、校验清单和 GitHub CI 产物 | `scripts/`、`.github/workflows/ci.yml` |

组件数量包含实现重合，不能当成 41 个全新实现。Tailblocks/HyperUI 仅精选 2 个区块，未把整套上游库安装进来。研究效果、独立演示和可添加组件分开计数。

## 保留接口，尚未实装

| 项目 | 当前处理 |
| --- | --- |
| website-assets 自动同步、升级与回滚 | 固定版本快照；`ModuleCatalogProvider.loadSnapshot` 已接入离线集合；联网同步/升级预留，不在打开工程时替换组件 |
| 任意 JS/WebGL 模块 | 静态模块校验不放宽；后续单独设计 mount/update/destroy、依赖与权限协议 |
| 完整动画时间轴、3D 编辑 | 尚未实现，现有预设不等同于完整编排系统 |
| React/Vue 工程适配与 TS 构建 | 尚未实现；代码编辑不等同于框架编译 |
| 桌面安装器、PWA、云账号和协作 | 尚未交付；先优化浏览器创作体验 |
| 五位首次使用者独立试用 | [任务和记录表](student-usability-check.md) 已准备，结果仍待执行 |

## 使用边界

工作台用于桌面创作，最小宽度约 1020px。多选最多 6 个 HTML 元素；复杂父级变换、百分比/三维起始变换会拒绝。导出 HTML 只处理支持的单页依赖，多页作品使用网站 ZIP。

编辑画布禁止运行作品脚本，显式预览与导出网站使用不同运行边界。源码不是任意网站的无损转换器，CSS 面板写入覆盖规则，详情见 [编辑契约](development/editor-contract.md) 与 [安全说明](../SECURITY.md)。

## 验证证据

| 证据 | 对应版本与结论 |
| --- | --- |
| 完整功能主线 | [PR #2](https://github.com/zczxz3/modular-website-studio/pull/2)，提交 `0e182ef`，合入 233 个普通文件，无 gitlink |
| 主线 CI | [运行 41872438348](https://github.com/zczxz3/modular-website-studio/actions/runs/41872438348)：依赖安装、check、package、Chromium 回归及产物上传全部通过 |
| 源码/DOM 与分发 | 发布基线为 133 项源码/DOM 测试 + 3 项分发测试；完整浏览器套件 30 项 |
| 本次文档整理 | 改动内容、下载包与校验信息见 [更新日志](../CHANGELOG.md) 和 Release；CI 结果以该提交自己的运行记录为准 |

历史文档中更少的测试数量和早期分支说明只属于当时版本。当前 CI 徽标或构建页的准确提交是最新判断依据。
