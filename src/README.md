# 源码地图

[项目首页](../README.md) · [开发导航](../docs/development/README.md)

| 路径 | 负责什么 | 关键入口 |
| --- | --- | --- |
| `main.tsx`、`App.tsx` | 应用启动、工作区编排与项目状态连接 | 从这里追踪用户操作 |
| `components/` | 开始页、资源面板、画布、内容/样式/特效面板及工具对话框 | `StartScreen`、`Canvas`、`ResourceBrowser`、`EffectPanel` |
| `core/` | 工程类型、源码解析、事务、模块校验、素材与导出 | `types.ts`、`source.ts`、`commands.ts`、`store.ts`、`io.ts` |
| `preview/` | 隔离 iframe 文档、选择/拖动桥接与受控预览 | `document.ts`、`bridge.js`、`design.js`、`motion.js` |
| `templates/portfolio/` | 中文多页作品集和本地 SVG 封面 | `manifest.ts`、`index.html`、`portfolio.css` |
| `resources/` | 固定版本的工作台模块、精选区块与 website-assets 库 | 统一注册在 `core/catalog.ts` |
| `vendor/` | 实际随作品导出的 AOS/AnimXYZ CSS/JS、许可证和哈希来源 | 不在这里修改上游库来解决适配问题 |
| `studio.css`、`studio-ui.css`、`workbench.css` | 编辑器基础样式、界面外观和工作区布局 | 不作为用户网站样式直接导出 |

## 资源分组

| 目录 | 内容 | 重建或说明 |
| --- | --- | --- |
| `resources/website-assets-library/` | 31 个上游静态模块、中文目录、原始包和 provenance | `node scripts/build-website-assets.mjs --check` |
| `resources/curated/` | Tailblocks/HyperUI 精选区块、编译 CSS 和原始来源 | `node scripts/build-curated.mjs` |
| `resources/foundation.ts`、`queue-card.ts` | 既有的新手适配示例 | [组件计数与重合范围](../docs/resource-sync.md) |
| `vendor/aos/`、`vendor/animxyz/` | 固定版本的可导出动效资源 | `npm run check:resources` |

添加视觉功能时，界面只负责收集意图；`core/` 负责真实持久修改，`preview/` 负责投影和临时反馈。适配器不要直接把画布 DOM 当作保存结果。
