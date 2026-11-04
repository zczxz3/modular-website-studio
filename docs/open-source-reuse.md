# 开源复用与本轮落地

本轮阅读了上游源码与官方文档，没有把文档浏览记成操作过完整商业软件。实际引入的是固定版本 **AOS 2.3.4**：原始 JS、CSS 和 MIT 许可证位于 `src/vendor/aos/`，Git blob 与 SHA-256 记录在 `provenance.json`，资源检查会核对其字节。

## 参考内容与采用方式

| 项目 | 核对到的内容 | 本轮采用 |
| --- | --- | --- |
| VvvebJs | Apache-2.0；动画插件将类型、时长、延迟写入元素属性；ZIP 插件从当前画布收集直接 CSS/JS/img 引用 | 对齐 `data-aos-*` 配置方式；通过现有源码事务适配，没有引入其 DOM 编辑器或整段插件代码 |
| AOS | MIT；JS/CSS 实际提供滚动动画、时长、延迟、距离和 once 设置 | **原样复用实际运行库**，加入本地依赖、初始化适配、减少动态效果和许可证交付 |
| Mobirise | 官方图片流程从点图开始；本地文件夹是发布方式之一 | 沿用图片选中后的上传/素材/裁切流程；未复制商业模板或素材 |
| Bootstrap Studio | 官方说明滚动动画使用 AOS，选中元素后调参数，Overview 标记已有动画 | 新增滚动参数、只播一次、动画列表和图层标记；查看源码配置及依赖 |
| GrapesJS / export | 核对核心许可证正文及导出插件 BSD 条款；Block、Trait 与导出命令职责独立 | 作为组件声明和参数面板的后续接口参考；现有 source-first 命令负责持久修改 |
| Shuffle | 官方按 UI library 与区块分类组织素材 | 后续增加同系列分组、主题兼容元数据；不搬用付费区块 |
| Webstudio | 整页与 section 模板分开；静态导出明确边界 | 保持整站模板/区块/小组件入口分层，整工程 ZIP 与单页 HTML 各有说明 |
| Silex / Pinegrow | 阅读官方入门、桌面与交互文档；Pinegrow 10 发布页此次无法读取 | 参考模板起步和内容编辑工作区；本轮不声称移植其运行时 |

VvvebJs 与 GrapesJS 插件依赖各自编辑器 API。Studio 沿用真实 HTML 源码、稳定 ID 和撤销事务，通过适配调用已有动画库，避免引入第二份可编辑页面模型。当前 ZIP 直接导出工程中全部文件，所以作品详情、背景资源、字体等只要在工程里，就随全站保存；单页导出继续检查其支持范围。

## 只跟踪一个动作

**空白项目 → 组件/拖入基础标题 → 滚动动画/淡入上移 → 延迟 350ms → 取消只播放一次 → 预览 → 导出单页 HTML。**

| 检查位置 | 实际保存位置 |
| --- | --- |
| 选中元素 | 原标题及稳定 `data-mws-id`，拖动和改字仍走原命令系统 |
| 面板参数 | `data-aos="fade-up" data-aos-duration="650" data-aos-delay="350" data-aos-offset="0" data-aos-once="false"` |
| 全站 ZIP 依赖 | `vendor/aos-2.3.4/aos.css`、`aos.js`、`studio-init.js`、MIT 许可证；每个使用页各引用一次，共用文件 |
| 单页 HTML | CSS、经典脚本内嵌，HTML 保留动画属性与完整 MIT 注释，离线无需 CDN |
| 继续编辑 | 工程和 HTML 重开都读取元素属性，动画列表可再次选中该标题 |

编辑画布不执行项目里的 AOS，并在投影中省略 `data-aos`，避免 AOS 的初始隐藏规则妨碍改字和拖动；原始 HTML 属性保留。明确的预览与导出页面运行上游库。AOS 动画使用 transform，Studio 拖动使用独立 translate；复杂的作者 transform 组合仍需容器适配。AOS 与旧淡入效果在同一元素上互斥，减少动态效果时由 AOS 的 disable 选项显示内容。

时长与延迟按上游 CSS 的 50ms 步长验证；支持的四种类型是淡入、淡入上移、淡入下移、缩放进入。未适配的 AOS 类型保持导入源码，不承诺完整编辑。删除效果移除配置；共享依赖保留，避免破坏其他元素。

## 来源

- [AOS 固定版本](https://github.com/michalsnik/aos/tree/1c7043c10a777d0ddcd2abfd08187619ac555353)、[原始说明](https://github.com/michalsnik/aos/blob/1c7043c10a777d0ddcd2abfd08187619ac555353/README.md)、[许可证](https://github.com/michalsnik/aos/blob/1c7043c10a777d0ddcd2abfd08187619ac555353/LICENSE)。
- [VvvebJs AOS 插件](https://github.com/givanz/VvvebJs/blob/1acbab7ebfe3e7b004f1f18c039d26550fc04bd8/libs/builder/plugin-aos.js)、[ZIP 插件](https://github.com/givanz/VvvebJs/blob/1acbab7ebfe3e7b004f1f18c039d26550fc04bd8/libs/builder/plugin-jszip.js)。
- [Bootstrap Studio 动画](https://bootstrapstudio.io/docs/animations.html)、[导出](https://bootstrapstudio.io/docs/exporting.html)、[Mobirise 图片](https://mobirise.com/help/images-452.html)。
- [GrapesJS Blocks](https://grapesjs.com/docs/modules/Blocks.html)、[Traits](https://grapesjs.com/docs/modules/Traits.html)、[export 源码](https://github.com/GrapesJS/export/blob/master/src/index.ts)。
- [Shuffle 同系列首屏](https://shuffle.dev/components/tailwind/shuffle-ux/headers)、[作品区](https://shuffle.dev/components/tailwind/shuffle-ux/portfolio)、[Webstudio 素材市场](https://docs.webstudio.is/university/marketplace)、[Silex Desktop](https://silex.me/download/)、[Pinegrow 交互](https://docs.pinegrow.com/docs/interactions/whats-new-in-interactions-2-0/)。

素材仓库的自动同步、版本升级仍沿用预留接口；固定依赖不会在重开工程时自动更新。

## 本轮验证

| 检查 | 实际结果 |
| --- | --- |
| `npm run check` | 通过：AOS 原始文件哈希、TypeScript、13 个文件中的 89 项单元/DOM 测试 |
| `npm run build` | 通过；仍有已有的 Monaco 大包提示 |
| 新增 AOS 定向用例 | 4 项通过，包含真实上游运行库在 JSDOM 中初始化、减少动态效果、HTML 再导入调参不重复加载、多页共享、全站资源、许可证及撤销 |
| `npm run test:e2e -- --list` | 16 项，5 个文件；仅发现，不代表浏览器通过 |
| `npx playwright test e2e/aos-reuse.spec.ts --workers=1 --max-failures=1` | 启动失败：环境缺少 Chromium headless shell 1248，没有浏览器断言执行 |

`e2e/aos-reuse.spec.ts` 验收真实拖入标题、设置延迟、预览、下载 HTML 和离线浏览器打开。JSDOM 检查的是源码、脚本执行和类状态，不能替代浏览器的可见动画及拖动验收。
