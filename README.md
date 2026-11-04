# Modular Website Studio

**模块化可视化网站开发软件 · source-first website editor**

像安装插件一样添加模块，直接操作真实网页元素，同时保留可手工编辑和独立运行的 HTML/CSS/JavaScript。

**当前为 0.1.0 alpha：静态网页双向编辑 MVP。** 这不是产品全功能版，也不是任意网站的无损转换器。React/Vue 适配、完整动画时间轴、3D、多人协作和远程市场尚未实现。

滚动动画直接复用固定版本 **AOS 2.3.4（MIT）**。拖入「基础标题」后设置淡入、延迟和只播放一次，参数保存在 `data-aos-*`，本地运行库和许可证随作品导出。已有动画可从页面列表和图层标记定位；复用来源、操作链路和范围见 [开源复用记录](docs/open-source-reuse.md)。

## 先完成自己的第一个网站

**首页使用模板 → 填中文姓名 → 上传两张作品封面 → 拖动作品卡排序 → 给标题加淡入 → 390px 手机预览 → 导出网站。** 整条流程无需打开代码编辑器，也无需在几个页面之间下载文件传递。

开始页提供真实作品集预览，进入后直接选中主标题。姓名会更新到模板标记的页眉、页脚和页面标题；封面可上传、从本地素材选择或使用纯色，支持裁切位置与图片说明。同一作品的首页和详情页同步更新，独立作品互不覆盖。作品集包含中文首页、两个作品详情页和创作手记。

选中标题、封面或区块后，右侧提供适用的本地特效。淡入用「触发时机／快慢／强弱」调节；CSS 悬停缩放、描边与磨砂效果随作品导出。拖动布局和这些效果分别保存，避免悬停覆盖用户放置的位置。需要代码时再打开「高级编辑」。

工作台提供浅色/深色界面、组件搜索与筛选、可收起的创作指引和左右面板。右侧按「内容／样式／特效」分组，画布可自动适应可用宽度。正文支持多行编辑、快捷应用和取消；可将选中元素定位到画布或选择父级。实际截图与验证记录见 [界面打磨](docs/interface-polish.md)。

| 操作 | 得到什么 | 适合什么时候 |
| --- | --- | --- |
| 保存草稿 | 当前浏览器首页的最近草稿；有效修改也会延迟自动保存 | 下次在同一浏览器继续修改 |
| 下载可编辑工程 | 完整 `website.mws.json`，含源文件、图片、模块配置 | 备份、换电脑、用「打开项目文件」继续 |
| 导出网站 | 全站 ZIP，或受支持的当前页单 HTML | 独立打开作品或交付给别人 |

浏览器草稿会显示保存状态；存储不足会报错并保留旧快照，请下载工程备份。单页 HTML 对跨页链接和不支持的依赖会给出原因；四页作品集选择完整网站 ZIP，解压后打开 `index.html`，图片和已应用效果不依赖 Studio。

**当前可运行成果在本地开发分支，尚未上线。** 核对时两个远端仓库均无 Pages/在线主页；发布并实际打开验证后，再在此处添加在线创作入口。远端 `main`、已有开发分支与本地代码的区别见 [仓库整理与版本矩阵](docs/repository-overview.md)，本轮检查见 [学生首个网站验收](docs/student-first-site-validation.md)。

图片支持通过 Cropper.js 拖框裁剪，元素背景支持通过 Grapick 编辑渐变色标；应用后写回本地图片和 CSS，支持撤销与独立导出。入口、范围和许可见 [P0 可视化工具](docs/p0-visual-tools.md)。

## 拖动组件，保留真实源码

从「组件」拖入静态卡片、标签切换或折叠问答，直接修改真实网页。结构模式在拖动中预览排列，Shift 可移入容器；自由模式调整位置和尺寸。松手产生一次可撤销修改，Esc 取消。复制保留局部样式，并生成独立元素身份。

组件库已内置同账号 `website-assets` 的 **31 个兼容静态组件**：左侧「组件」→「组件来源」→「我的组件库 · 31」，支持中文名称/分类/ID 搜索、拖入、保存和独立导出。加上既有 10 个工作台模块，目录共 41 项；其中部分新手适配与原版实现重合，不计作新增实现。JS/WebGL 运行时与 20 个待实现特效尚未注册，网络同步和自动升级保持后置。来源、限制与验收见 [组件库接入说明](docs/resource-sync.md)。

P1–P4 的首批可用范围已接入：Tailblocks/HyperUI 精选区块、Moveable/Selecto 多选变换、AnimXYZ 组合预设和本地批量素材管理。使用入口与限制见 [P1–P4 验收记录](docs/p1-p4.md)。

## 下载与启动

需要 **Node.js 22.12+** 和桌面浏览器（工作台宽度至少 1020px）。所有作品处理在浏览器内完成，不需要账号、AI/API 或后端服务。

### 从 GitHub 克隆

```bash
git clone https://github.com/zczxz3/modular-website-studio.git
cd modular-website-studio
npm ci
npm start
```

打开终端显示的地址。源码、模板、组件、许可证都以普通文件提交，不需要初始化子模块，也不依赖开发者机器上的 Git 工作树路径。

也可选择 GitHub 的 **Code → Download ZIP**，完整解压到新目录，在包含 `package.json` 的文件夹运行 `npm ci`、`npm start`。源码 ZIP 无需 `.git` 就能运行。

### 使用构建好的网页包

CI 的 `studio-source-and-web` 产物包含完整源码 ZIP 和 `modular-website-studio-web.zip`。完整解压网页包后，Windows 双击 `start.cmd`；macOS/Linux 运行 `sh start.sh`，再打开 `http://127.0.0.1:4173`。网页包只需要 Node.js，不需要 Git 或 npm 安装依赖。不要直接双击 `app/index.html`，浏览器会限制 `file://` 下的模块和 Worker。

本地生成同样的包：

```bash
npm run check           # 检出完整性、固定资源、TypeScript、源码和分发测试
npm run package         # 构建并生成 release/ 下的完整源码包和网页包
npm run serve           # 以本地 HTTP 服务打开 dist/，无需额外服务库
npx playwright install chromium
npm run test:e2e
```

打包脚本要求源码已经提交，避免下载包与 Git 版本不一致。源码包由 `git archive` 生成，不携带 `.git` 指针、`node_modules` 或工作区缓存；`release/manifest.json` 记录版本和 SHA-256。

如果克隆目录为空或 Git 提示 `not a git repository` / `gitdir` 路径失效，请保留原目录，在旁边重新克隆到 `modular-website-studio-clean`，或下载完整源码 ZIP。不要复制其他机器或旧工作树的 `.git` 文件。详细检查与恢复步骤见 [下载和克隆修复](docs/checkout-and-release.md)。

## Try the complete editing loop

1. Choose **打开源码编辑示例** on the start screen to open **山川之上 / Field Notes**, or import `examples/basic/`.
2. Click an element in the actual canvas. Its DOM layer and HTML opening tag are located in the editor.
3. Double-click a leaf text element, type, then press Enter or click elsewhere. The HTML source changes.
4. Choose **自由布局**, drag the button, then drag its lower-right resize handle. Inspect the generated `studio.css`. Movement uses the independent CSS `translate` property, preserving existing `transform` and normal flow.
5. Choose **结构化布局** to reorder elements. Drop beside a target; hold Shift to drop inside a container. The actual source DOM hierarchy changes. The inspector's **移入容器** and **上移/下移** provide precise alternatives.
6. Edit HTML/CSS with Monaco or the optional plain-text editor. The canvas updates without recreating the iframe.
7. Break a CSS block: a diagnostic appears and the last valid canvas stays intact. Fix it or discard the draft. Visual writes and normal save/export are blocked while the draft is invalid.
8. Use **保存草稿** for the current browser or **下载可编辑工程** for a portable `website.mws.json` backup. Reload and open a recent draft, or reopen the downloaded project.
9. Export `website-export.zip`, extract it, then serve it with any static web server. The export contains ordinary source files and assets, with no Studio runtime dependency. Its original button script runs independently.

The `预览` workspace runs project scripts in an isolated iframe; dynamic DOM changes there do not write back to source. Leaving preview returns to the authoritative project.

## Implemented scope

| Area | 0.1 alpha behavior |
| --- | --- |
| Project model | Source files are authoritative; parsed DOM and canvas are derived views |
| HTML | parse5 locations, stable `data-mws-id`, targeted source slices, explicit full-document import |
| Commands | Text / attributes / CSS / move / insert / duplicate / delete; atomic transactions; 100-step undo/redo; revision guard |
| Canvas | Real HTML nodes, live structural drag/reflow, cancelable free movement and resize, one transaction per gesture, zoom and device widths |
| Inspector | id/class, text, parent container, CSS overrides, dimensions, box model and separate read-only computed values |
| Code | Locally bundled Monaco + HTML/CSS/JS/TS language support; cursor-to-canvas mapping; source highlight; diagnostics |
| Updates | Keyed DOM reconciliation; text/CSS patches do not replace the whole page or iframe |
| Import/save | HTML + CSS + JS, folders, ZIP, project JSON, assets; 20 MB / 500-file import limits |
| Modules | Built-in HTML/CSS modules and controlled tabs/accordion; static local ZIP install; shared CSS; strict permissions/dependencies |
| Export | Original file tree as website ZIP; supported active page as self-contained HTML with CSS/JS/assets |
| Multiple pages | Preserve and switch imported HTML pages; export all pages |

## Deliberate limitations

- Full documents need explicit `html`, `head`, `body` and closing head/body tags. Optional HTML end tags may remain in source, but elements without explicit closing tags cannot accept visual insert/move operations. Corrected/malformed HTML is not promised to round-trip.
- A stable `data-mws-id` attribute is added to source-backed elements. Unchanged source bytes are retained apart from these insertions. Keep these attributes: generated CSS uses them and exports preserve them. Replacing or deleting an identity in code creates a new node and may orphan old overrides; automatic semantic re-identification is not implemented.
- Inspector edits write explicit overrides into `studio.css`, not arbitrary original CSS rules. Inline styles, `!important`, and stronger selectors may win. Computed values are shown separately. The current version does not promise cascade attribution.
- Free movement retains layout space; it is CSS translation, not automatic absolute-position conversion. The separate design mode supports up to six HTML elements, Moveable drag/resize/rotation/snapping and same-parent left/top alignment with Selecto selection. Transformed ancestors and percentage/3D starting transforms are rejected. Clipboard paste and dedicated pan gestures are not implemented.
- Editing scripts never execute. Explicit preview supports inline and local plain scripts. Network APIs, forms, popups and parent access are blocked. ES-module graphs, build pipelines, external stylesheets, conditional CSS imports, `srcset`, template and dynamic DOM adaptation need additional adapters. Export preserves the original project sources/resources.
- TypeScript can be edited with Monaco, but there is no project TypeScript bundler; export preserves `.ts` files. The authoritative validator currently checks HTML, CSS and JavaScript, not TypeScript semantics.
- Normal preview works for the supported static subset. This is not a full Chrome DevTools replacement. Imported content can still consume substantial CPU/memory; do not treat the alpha as a hardened hostile-code execution service.
- Imported modules are static HTML/CSS. Built-in tabs and accordion use a separate trusted runtime; they do not grant scripts or permissions to ZIP modules. CSS class names should be namespaced. Arbitrary script modules, dependencies, permission grants, third-party runtime hooks, updates and marketplace installation are deferred. Uninstalling removes a library entry and keeps already inserted HTML/CSS.
- Duplication preserves generated `studio.css` rules and updates internal HTML ID references. It does not rewrite arbitrary author CSS or JavaScript selectors that name an original HTML ID; review such custom selectors when duplicating imported content.
- Code parsing is currently whole-file and history is snapshot-based; DOM application is incremental. Large-project incremental AST parsing and history coalescing are future work. Monaco language workers are locally bundled and contribute a substantial initial download.
- Valid committed edits are saved to the current browser after a short delay and on supported page-hide events. Browser storage can be cleared, denied or fill up; check the visible save state and keep a downloaded project backup. Invalid code drafts are not auto-saved and can be downloaded separately; fix their source before normal reopening.

## Architecture and development

- [Documentation index](docs/README.md) · [Repository overview](docs/repository-overview.md) · [Five-student usability protocol](docs/student-usability-check.md)
- [Architecture decision and editor evaluation](docs/architecture.md)
- [Project format and module format](docs/formats.md)
- [Roadmap and acceptance criteria](docs/roadmap.md)
- [Validation record](docs/validation.md)
- [Contributing](CONTRIBUTING.md) · [Security model](SECURITY.md)

The shell uses React + TypeScript + Vite. The HTML editing core deliberately does not use a component-catalogue model as its canonical state. Puck/Craft.js may become adapters for supported React component projects later.

## License

[MIT](LICENSE). Third-party packages keep their own licenses. Lucide React 1.68.0 supplies editor icons; its ISC and derived Feather MIT notices ship in [public/licenses/lucide.txt](public/licenses/lucide.txt). AOS 2.3.4 is vendored unchanged with its MIT notice and pinned hashes in `src/vendor/aos/`; applied projects include the notice in their files and HTML. Selected original MIT modules from `zczxz3/website-assets` are bundled with source revisions and the full notice in `src/resources/`. The two portfolio SVG covers are original MIT artwork. Imported content keeps its own rights.
