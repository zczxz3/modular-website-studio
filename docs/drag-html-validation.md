# Dragging CSS/JS components and saving HTML

This iteration continues `feat/portfolio-workbench`. It adds live drag feedback, two controlled interactive components, copied local styles and single-file HTML export while keeping source files authoritative. The external resource repository still has only a reserved integration interface and frozen local examples.

## Implemented flow

1. Choose **空白项目**, open **组件**, and drag **标签切换** into the canvas. The new component is selected after insertion.
2. Double-click text to edit it. Select **默认显示** in the inspector; click **选中整个组件** to manipulate the whole widget from any selected descendant.
3. Drag in **结构化布局** to see document flow update before releasing. Hold Shift to nest inside a container. Use **自由布局** to move with CSS translation or use the lower-right resize handle. Escape cancels; release produces one undoable source change.
4. Add **折叠问答**, choose its default item or **全部收起**, and select single or multiple expansion. **试用交互** runs the saved defaults in the explicit preview; editing shows all content.
5. **保存项目** keeps the complete editable file tree in `.mws.json`. **导出 HTML** saves the active page with supported CSS, classic JavaScript and assets embedded. Reopen either downloaded file from a fresh browser context.
6. Open the exported HTML independently and use its tabs and accordion. For the two-page portfolio or unsupported dependencies, use **导出完整网站 ZIP** to retain the project files.

## Automated coverage

- `tests/drag.test.ts`: live DOM reordering/nesting, restore/cancel, one command per release, free movement/resize, native resource drop cleanup and pointer capture only after a real drag starts.
- `tests/interactions.test.ts`: independent and nested instances, keyboard/ARIA behavior, setup/disposal, file collision avoidance, shared runtime, source defaults and changes to button/panel pairing.
- `tests/core.test.ts`: copied element/descendant overrides, independent identities, internal HTML references, conditional style context, undo/redo and save/reopen.
- `tests/export-html.test.ts`: source-preserving resource packaging, CSS imports/fonts/images/SVG, classic deferred data-script execution, UTF-8, HTML re-export and explicit unsupported-dependency failures.
- `tests/html-roundtrip.test.ts`: two real interactive instances plus CSS translation → single HTML → project reimport → second HTML export. Both exported output and explicit runtime preview execute the embedded script in JSDOM; editor projection excludes it.
- `e2e/drag-components.spec.ts`: actual native resource drag, inspector defaults, CSS drag/undo/redo, downloads, fresh-context reopening, standalone HTTP-served HTML interaction and multi-page ZIP fallback.

## Execution record

Observed on 2026-11-04:

| Check | Actual result |
| --- | --- |
| `npm run check` | Passed: frozen-resource integrity, TypeScript and **66 unit/DOM tests in 8 files** |
| `npm run build` | Passed; existing Monaco chunk-size warning remains |
| `npm run test:e2e -- --list` | 13 tests discovered in 3 files; this is not a browser pass |
| Targeted new Playwright suite | Blocked at browser launch; first case failed to launch and second did not run |
| Browser install | Failed: downloaded archive was invalid/truncated |

The browser suite has **13 discovered tests in 3 files**, including 2 new cases. Discovery is not a browser pass. The local Chromium install attempt returned a truncated/invalid archive (`End of central directory record signature not found`). A subsequent targeted Playwright run stopped at browser launch because `chromium_headless_shell-1248` was absent; **no browser assertions executed**. These changes still need a working Chromium acceptance run.

## Compatibility boundaries

The single-file exporter handles a bounded static subset; it is not a framework or arbitrary JavaScript dependency bundler. Cross-page links, detected dynamic resource loads, modules/import maps, CSP/base directives, missing/external dependencies, conditional CSS imports and unsupported resource forms are reported before download. Dynamically constructed dependencies may require manual review and ZIP export. See [formats](formats.md).

Editing never executes project JavaScript. Tabs and accordion are trusted built-in implementations, not permission grants to third-party module ZIPs. The imported HTML keeps ordinary HTML/CSS/JS and stable element identities; `.mws.json` remains the complete project format with module definitions. Author CSS/JS selectors targeting an original HTML ID are not automatically rewritten on duplication.

No remote resource synchronization, deployment or source upload is part of this iteration. The earlier public-repository upload restriction remains in place.
