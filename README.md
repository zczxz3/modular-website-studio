# Modular Website Studio

**模块化可视化网站开发软件 · source-first website editor**

像安装插件一样添加模块，直接操作真实网页元素，同时保留可手工编辑和独立运行的 HTML/CSS/JavaScript。

**当前为 0.1.0 alpha：静态网页双向编辑 MVP。** 这不是产品全功能版，也不是任意网站的无损转换器。React/Vue 适配、完整动画时间轴、3D、多人协作和远程市场尚未实现。

## Run locally

Requires **Node.js 22.12+** (or compatible current LTS) and npm.

```bash
git clone https://github.com/zczxz3/modular-website-studio.git
cd modular-website-studio
npm ci
npm run dev
```

Open the URL Vite prints. Use a desktop browser; the workspace currently requires at least 1020px width. All project processing happens in your browser. There is no account service or AI/API dependency.

```bash
npm run check           # TypeScript + core / DOM tests
npm run build           # production static application in dist/
npm run preview         # serve production build
npx playwright install chromium
npm run test:e2e        # real Chromium interaction + exported website tests
```

## Try the complete editing loop

1. Open the built-in **山川之上 / Field Notes** HTML project, or import `examples/basic/`.
2. Click an element in the actual canvas. Its DOM layer and HTML opening tag are located in the editor.
3. Double-click a leaf text element, type, then press Enter or click elsewhere. The HTML source changes.
4. Choose **自由布局**, drag the button, then drag its lower-right resize handle. Inspect the generated `studio.css`. Movement uses the independent CSS `translate` property, preserving existing `transform` and normal flow.
5. Choose **结构化布局** to reorder elements. Drop beside a target; hold Shift to drop inside a container. The actual source DOM hierarchy changes. The inspector's **移入容器** and **上移/下移** provide precise alternatives.
6. Edit HTML/CSS with Monaco or the optional plain-text editor. The canvas updates without recreating the iframe.
7. Break a CSS block: a diagnostic appears and the last valid canvas stays intact. Fix it or discard the draft. Visual writes and normal save/export are blocked while the draft is invalid.
8. Save: download `website.mws.json` and keep a browser-local copy. Reload the editor and choose **重新打开已保存**, or open the downloaded file.
9. Export `website-export.zip`, extract it, then serve it with any static web server. The export contains ordinary source files and assets, with no Studio runtime dependency. Its original button script runs independently.

The `预览` workspace runs project scripts in an isolated iframe; dynamic DOM changes there do not write back to source. Leaving preview returns to the authoritative project.

## Implemented scope

| Area | 0.1 alpha behavior |
| --- | --- |
| Project model | Source files are authoritative; parsed DOM and canvas are derived views |
| HTML | parse5 locations, stable `data-mws-id`, targeted source slices, explicit full-document import |
| Commands | Text / attributes / CSS / move / insert / duplicate / delete; atomic transactions; 100-step undo/redo; revision guard |
| Canvas | Real HTML nodes, click selection, leaf text editing, structural drag, free movement, resize handle, zoom and device widths |
| Inspector | id/class, text, parent container, CSS overrides, dimensions, box model and separate read-only computed values |
| Code | Locally bundled Monaco + HTML/CSS/JS/TS language support; cursor-to-canvas mapping; source highlight; diagnostics |
| Updates | Keyed DOM reconciliation; text/CSS patches do not replace the whole page or iframe |
| Import/save | HTML + CSS + JS, folders, ZIP, project JSON, assets; 20 MB / 500-file import limits |
| Modules | Built-in HTML/CSS modules; local ZIP install; insert; remove from library; fail closed on permissions/dependencies |
| Export | Original file tree + assets + generated CSS; portable static website ZIP |
| Multiple pages | Preserve and switch imported HTML pages; export all pages |

## Deliberate limitations

- Full documents need explicit `html`, `head`, `body` and closing head/body tags. Optional HTML end tags may remain in source, but elements without explicit closing tags cannot accept visual insert/move operations. Corrected/malformed HTML is not promised to round-trip.
- A stable `data-mws-id` attribute is added to source-backed elements. Unchanged source bytes are retained apart from these insertions. Keep these attributes: generated CSS uses them and exports preserve them. Replacing or deleting an identity in code creates a new node and may orphan old overrides; automatic semantic re-identification is not implemented.
- Inspector edits write explicit overrides into `studio.css`, not arbitrary original CSS rules. Inline styles, `!important`, and stronger selectors may win. Computed values are shown separately. The current version does not promise cascade attribution.
- Free movement retains layout space; it is CSS translation, not automatic absolute-position conversion. Complex transformed resizing, snap lines, multi-select, clipboard paste, alignment tools and dedicated pan gestures are not implemented.
- Editing scripts never execute. Explicit preview supports inline and local plain scripts. Network APIs, forms, popups and parent access are blocked. ES-module graphs, build pipelines, external stylesheets, conditional CSS imports, `srcset`, template and dynamic DOM adaptation need additional adapters. Export preserves the original project sources/resources.
- TypeScript can be edited with Monaco, but there is no project TypeScript bundler; export preserves `.ts` files. The authoritative validator currently checks HTML, CSS and JavaScript, not TypeScript semantics.
- Normal preview works for the supported static subset. This is not a full Chrome DevTools replacement. Imported content can still consume substantial CPU/memory; do not treat the alpha as a hardened hostile-code execution service.
- Modules are static HTML/CSS. CSS class names should be namespaced. Arbitrary scripts, dependencies, permission grants, runtime lifecycle hooks, updates, events and marketplace installation are deferred. Uninstalling removes a library entry and keeps already inserted HTML/CSS.
- Code parsing is currently whole-file and history is snapshot-based; DOM application is incremental. Large-project incremental AST parsing and history coalescing are future work. Monaco language workers are locally bundled and contribute a substantial initial download.
- Save is explicit, not an autosave guarantee. Browser storage can be cleared or fill up: keep the downloaded project file. Invalid drafts can be downloaded separately; fix their source before normal reopening.

## Architecture and development

- [Architecture decision and editor evaluation](docs/architecture.md)
- [Project format and module format](docs/formats.md)
- [Roadmap and acceptance criteria](docs/roadmap.md)
- [Validation record](docs/validation.md)
- [Contributing](CONTRIBUTING.md) · [Security model](SECURITY.md)

The shell uses React + TypeScript + Vite. The HTML editing core deliberately does not use a component-catalogue model as its canonical state. Puck/Craft.js may become adapters for supported React component projects later.

## License

[MIT](LICENSE). Third-party packages keep their own licenses. This project does not bundle third-party website assets or claim rights to imported content.
