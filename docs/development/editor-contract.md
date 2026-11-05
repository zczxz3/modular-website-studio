# 编辑行为与兼容性边界

[开发导航](README.md) · [当前功能](../status.md)

以下保留源码编辑与导出的详细约束。运行和新手流程请先看 [使用指南](../guides/first-website.md)。

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

