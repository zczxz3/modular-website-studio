# Validation record

Date: **2026-11-04**. This record distinguishes executed checks from future coverage.

This page records the original source-editor baseline and its historical CI run. For subsequent work, see [portfolio validation](portfolio-validation.md) and the current [drag/component and single-HTML validation](drag-html-validation.md); the baseline browser result does not certify those later changes.

## Executed locally

- `npm run check`: TypeScript passed; **14 tests passed in 2 files**.
- `npm audit`: **0 reported vulnerabilities** after overriding Monaco's transitive DOMPurify dependency to `3.4.17`. The lockfile records the exact package; audit results are time-dependent.
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

**Passed in GitHub Actions:** [run 41768512621](https://github.com/zczxz3/modular-website-studio/actions/runs/41768512621), source commit `8484b100e9d52f7ea76392c9f8811efea884da6e`, Node 22, Chromium on Ubuntu. TypeScript, all 14 core tests and production build passed; **2 browser tests passed in 7.2 seconds without retries**. Dependency installation also reported 0 vulnerabilities.

`e2e/editor.spec.ts` executed the complete visual/code edit → drag/resize → invalid CSS recovery → project download → reload → reopen downloaded file → ZIP export → load exported bytes at a separate origin → operate the original JavaScript flow. Its second test executed real Monaco input and structured drag ordering. The exported page used no Studio runtime.

The first run exposed ambiguous alert selection and a pointer target hidden beneath Monaco's rendered lines. Tests now target project diagnostics specifically and focus Monaco through keyboard input. Assertions and acceptance scope were retained.

The workflow runs on pushes and PRs; future commits should be assessed from their own CI result. This record covers the source commit above and subsequent documentation-only changes.

## Infrastructure limits in this session

- Browser download tooling failed to return completed download files and subsequently timed out. That cloud-browser tooling limitation was subsequently covered by the passing automated Chromium save/download/reopen/export flow above.
- A local-module ZIP browser upload attempt was interrupted; module validation and registry are covered by core tests, but that file-picker interaction is not marked passed.
- GitHub repository creation succeeded, but GitHub integration tree writes returned `403 Resource not accessible by integration`, even without workflow files. All 39 source, documentation, example and workflow files were published through the authorized GitHub web upload workflow and verified against local Git blob hashes. The later CI run above passed.

## Remaining verification scope

Cross-browser behavior, hostile-code resource exhaustion, arbitrary third-party sites, framework adapters, complex CSS transforms, large projects, nested ES module graphs and full accessibility audits are outside this alpha's executed coverage. Do not infer support for them from the basic sample.
