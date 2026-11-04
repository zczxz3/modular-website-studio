# Product scope and roadmap

The goal is a combined visual canvas, source editor, installable module platform and animation workstation. Correct source round trips come before advanced visual polish.

## Phase 1 — working alpha

- [x] Create/open static HTML projects, folder/ZIP import, multiple imported pages
- [x] Select source-backed DOM nodes and locate their HTML
- [x] Structural reordering / nesting and separate CSS-translation free mode
- [x] Live drag reflow, cancel/revert, one undo per gesture and copied local styles
- [x] Resize handles, text editing, id/class, source CSS overrides, computed-style inspection
- [x] Monaco HTML/CSS/JS/TS editing; bidirectional selection and rendering
- [x] Error diagnostics, last-valid preview, stale-operation rejection
- [x] Atomic visual commands, undo/redo, explicit save, reopening, source/asset export
- [x] Install static HTML/CSS module ZIPs; add modules and uninstall library entries
- [x] Built-in tabs / accordion with source-backed default state and standalone runtime
- [x] Supported current-page single HTML export, CSS/JS/assets embedding and HTML reimport
- [x] Core round-trip and keyed DOM lifecycle tests
- [x] Execute Chromium CI for visual/code edits, save/download/reopen and standalone export
- [ ] Expand the browser/version matrix beyond the tested Chromium runner
- [ ] Clipboard cut/copy/paste, multi-select, guides, snapping and alignment
- [ ] Complete CSS cascade provenance, attribute catalogue and layout-specific resize rules
- [ ] Incremental worker parsing and coalesced typing history for larger projects
- [ ] Touch/mobile authoring and keyboard drag equivalents

Acceptance: open/create real HTML → select → drag/resize/edit → inspect changed source → edit code → inspect live canvas → save → reopen → export → operate exported website without Studio.

## First student website

The current delivery target is a student's first Chinese portfolio: homepage template → name → two uploaded covers → complete-card ordering → title effect → 390px preview → independent website. Local implementation and remaining release evidence are tracked in [student acceptance](student-first-site-validation.md); real usability checks use the [five-student protocol](student-usability-check.md). Browser verification, five-person results and an actual online entry remain release gates, not completed claims.

## Resource repository integration

- Current: fixed local examples and a typed static-module provider interface.
- Deferred: `website-assets` repository loading, synchronization, installation updates and version upgrades until the upstream format stabilizes.
- Continue validating the first-portfolio workflow against the local examples in the meantime.

## Phase 2 — adapters and motion

- GSAP keyed animation configuration, timeline, easing and event/scroll triggers
- Stable DOM target relationships for animation tracks
- Plugin registry, versioned manifests, editable parameters, event bus, dependency graph and compatibility resolution
- Runtime permission model, trusted/untrusted module isolation and explicit lifecycle APIs
- Resource ownership: scroll controllers, subscriptions, requestAnimationFrame, animation disposal, WebGL textures/materials/geometries
- Three.js scene modules, static resource graph, richer project import
- React/Puck or Craft.js adapter and Vue adapter with explicit editable/read-only boundaries
- Build adapters for TS/JS modules and framework-specific toolchains

## Phase 3 — open ecosystem

- Remote module market, signed releases, update and rollback workflows
- Optional AI-assisted page analysis and module reconstruction
- Automatic layout/theme adaptation with reviewable source diffs
- Team collaboration with conflict-aware commands
- Electron packaging after browser core is reliable

The project does not currently advertise GSAP/Three.js support merely by listing them as future dependencies. Each new capability must have a real source/save/export test and a documented compatibility boundary.
