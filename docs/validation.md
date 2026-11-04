# Validation record

Date: **2026-11-04**. This record distinguishes executed checks from future coverage.

## Executed locally

- `npm run check`: TypeScript passed; **14 tests passed in 2 files**.
- `npm run build`: production bundle built successfully. Monaco/TypeScript worker size warnings are expected and remain a performance limitation.
- Source round trip: original source bytes (apart from identity attributes), text escaping, generated CSS, DOM reparenting, undo/redo, save/load equality and ZIP export/reimport.
- Error recovery: invalid HTML/CSS/JS, duplicate identity, CSS declaration injection, non-leaf text edits and stale revisions.
- Transaction rollback, descendant CSS cleanup, fresh identities on duplication.
- Resource byte preservation, path traversal rejection, malformed project schema, executable module rejection and permission/dependency rejection.
- jsdom keyed reconciliation: the **same real DOM object** and its listener survive text updates and moving between parents.

## Executed through a real browser

- App starts with a real editable HTML iframe and locally bundled Monaco.
- Canvas double-click → edited title → changed HTML source.
- Manual source text edit → updated heading in the same canvas.
- Inspector color edit → `studio.css` and a real stylesheet link.
- Pointer drag at 80% zoom → generated `translate: 60px 30px`.
- Resize handle drag → generated `width: 198px` and `height: 75px`.
- Unclosed CSS block → visible line diagnostic, previous canvas retained and destructive source writes disabled.
- Monaco CSS input → computed heading color changed to `rgb(10, 20, 30)`.
- Browser-local save → full reload → reopen → edited heading and CSS restored.
- Structural pointer drag → article order changed from Terrain/Stories to Stories/Terrain.
- Explicit isolated preview → original button listener changed the heading; leaving preview restored source-backed content.

## Automated browser suite

`e2e/editor.spec.ts` contains Chromium tests for the complete save/download/open/export flow, Monaco input, structural dragging, and loading exported bytes at a separate origin with no Studio runtime. The GitHub Actions workflow runs these tests on each push/PR. Check the actual workflow result; a test's presence is not a passing result.

## Infrastructure limits in this session

- Browser download tooling failed to return completed download files and subsequently timed out. The downloaded-project reopening and standalone exported-site **browser** flow is therefore not marked passed. ZIP bytes and save/load/export round trips are covered by executed core tests.
- A local-module ZIP browser upload attempt was interrupted; module validation and registry are covered by core tests, but that file-picker interaction is not marked passed.
- GitHub repository creation succeeded, but GitHub integration tree writes returned `403 Resource not accessible by integration`, even without workflow files. Publishing therefore uses the authorized GitHub web upload workflow. Check the repository Actions page for the actual CI result.

## Remaining verification scope

Cross-browser behavior, hostile-code resource exhaustion, arbitrary third-party sites, framework adapters, complex CSS transforms, large projects, nested ES module graphs and full accessibility audits are outside this alpha's executed coverage. Do not infer support for them from the basic sample.
