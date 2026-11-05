# Beginner portfolio workbench validation

> 阶段记录：以下测试数量、分支和范围属于记录时的版本。当前功能与发布状态见 [项目现状](status.md)，操作入口见 [新手指南](guides/first-website.md)。

This change builds on the module-roundtrip repair branch (PR #1). It keeps source files, stable IDs, ProjectStore transactions, strict static-module validation and the isolated editing iframe as the existing foundation.

## User flow

Start with **留白 · 个人作品集**, edit a title by double-clicking, select a cover and use either bundled artwork or a real file picker, connect **查看作品** to **作品展示**, insert a designed image block, choose a theme, apply **淡入并上移**, preview desktop/mobile, save and export. The advanced code panel stays closed throughout.

The template contains a portfolio home page and a journal page, two local SVG covers, two coordinated themes and an exportable controlled animation. Template copies and recent projects are independent. The library includes a two-image section and four basic components, including a fixed local example adapted from `queue/project-card`. Resource provenance and the deferred integration contract are in [resource-sync.md](resource-sync.md).

## Automated acceptance

`e2e/workbench.spec.ts` uses actual browser UI, file choosers and downloads. It checks:

- Content, long titles, portrait covers, section links, theme overrides/reset and motion add/remove/replay.
- Block and effect undo/redo, repeated shared CSS on two pages and narrow layouts.
- Downloaded `.mws.json` opened in a fresh browser context with empty local storage.
- Actual website ZIP extraction and an independent HTTP server: both pages, images, links, animation and reduced motion.
- Independent template copies and persistent recent projects.
- Native resource drag insertion and document-flow block sorting.
- Repeated inline edits, blur, Escape and one-step undo.
- Two independently editable bundled project cards, active-theme styling and one shared stylesheet.

`e2e/editor.spec.ts` keeps the existing six source-sync, module-roundtrip, collision and isolation checks. `tests/workbench.test.ts` covers the corresponding source transactions, runtime lifecycle, resource collisions, retained installed definitions, and theme rules.

## Execution record

Observed on 2026-11-04:

| Check | Actual result |
| --- | --- |
| `npm run check` | Passed: resource integrity check, TypeScript, 35 unit/DOM tests |
| `npm run build` | Passed; existing Monaco chunk-size warning remains |
| `npm run check:resources` | Verifies the frozen local examples only; repository synchronization is deferred |
| `npm run test:e2e -- --list` | 11 tests discovered; discovery is not a passing browser run |
| Local `npm run test:e2e` attempt | Blocked at browser launch: `chromium_headless_shell-1248` executable unavailable; none of the browser assertions ran |
| GitHub browser CI | Not run for these changes: source upload was rejected by automatic approval review pending explicit authorization to publish this batch to the user's public repository |

The connected GitHub login and repository owner were both verified as `zczxz3`, with push/admin permission. Ownership verification did not remove the approval requirement. The implementation is locally reviewable, but the complete browser acceptance flow must not be marked passed until CI actually runs. No upstream resource repository changes or deployment were performed.

## Resource scope revision

Following the request to defer integration while the resource repository changes rapidly, the workbench now keeps a typed provider contract and a local example snapshot. The repository loader and synchronization script are not part of this iteration. All portfolio acceptance steps continue to use the bundled examples.

## Short manual acceptance

1. On `feat/portfolio-workbench`, run `npm ci` and `npm run dev`, then choose **使用模板**.
2. Double-click the title. Select the cover, choose **使用回廊 · 竖幅**, then try **从本机上传**. Select **查看作品** and choose **作品展示** in the target list.
3. Select **区块 → 添加到此处**. Undo and redo once. Select **组件 → 项目展示卡片 → 添加到此处**.
4. Choose **深海蓝调**, select the title, and choose **应用淡入并上移**. Use **重播效果**. Switch **手机 → 预览** and click the works link.
5. **保存项目** downloads `website.mws.json`. Open it using **打开项目文件** in a private browser window. Verify the modified content, cover, theme, links and effect.
6. **导出网站** downloads `website-export.zip`. Extract and serve it with a static server; verify the home and journal pages and their images, links and effect.

This portfolio iteration produced a static website ZIP. The subsequent [drag/component iteration](drag-html-validation.md) adds single-file HTML for supported individual pages; the two-page portfolio still uses ZIP to retain navigation. Additional complete templates, an advanced timeline, Three.js and remote marketplace remain deferred. The workspace is intended for desktop authoring; its mobile switch previews the produced page.
