# Project and module formats

## Project v1

`website.mws.json` stores a `format: "mws-project"`, `version: 1`, display `name`, HTML `entry`, `files` and installed `modules`.

Each file is `{ "kind": "text", "content": "..." }` or `{ "kind": "asset", "content": "data:image/png;base64,..." }`. File paths are relative and retained on export. Project JSON retains sources, stable identities, generated styles, JavaScript and binary assets. Preview runtime and selection overlays are not saved. Editor UI preferences and undo history are session-only.

Source code is the persisted data model. There is no duplicate serialized DOM that might become inconsistent with the files.

## Static module v1

Create a ZIP with `module.json` at its root. HTML and CSS are inline fields; separate entry files, JS hooks and asset bundles are future schema versions.

```json
{
  "id": "example/note",
  "version": "1.0.0",
  "name": "Note card",
  "description": "An editable semantic note",
  "html": "<article class=\"example-note\"><h2>A new idea</h2><p>Write here.</p></article>",
  "css": ".example-note { padding: 24px; border: 1px solid #789; border-radius: 12px; }",
  "permissions": [],
  "dependencies": {}
}
```

Package the provided example:

```bash
python -m zipfile -c note-module.zip examples/modules/module.json
```

The Python command puts the basename `module.json` in the archive. Install it using **模块 → 安装模块 ZIP**, then add it to the current container. CSS is stored in a module-specific project file; HTML is inserted through the same source command system. A duplicate installed ID is rejected, including newer versions; there is no implicit update behavior. Uninstalling from the library keeps existing page instances and their CSS. To remove a page instance, select and delete its DOM subtree.

Import limits: 20 MB compressed and expanded, at most 500 archive entries. Absolute paths, traversal segments and dangerous object-key names are rejected. Executable tags, event attributes, nonempty permissions and dependency declarations are rejected for this static-only module version. Use a unique class prefix; the alpha does not provide Shadow DOM or automatic CSS scoping.

ZIP installation and `.mws.json` reopening use the same module validator: manifest shape, HTML (including template contents), CSS syntax, permissions and dependencies. This restriction applies to module manifests, not ordinary static website source files. Imported website JavaScript remains in the project and export, but is not executed in the editing iframe.

New module CSS paths encode every ASCII ID byte as two hexadecimal digits: `a/b` becomes `modules/mws-612f62.css`, while `a-b` becomes `modules/mws-612d62.css`. Repeated instances share one CSS file, and each using page receives one relative stylesheet reference. Existing v1 files and references are retained; an old `modules/a-b.css` is reused when its content matches the module CSS. A different or manually modified legacy file is never overwritten. Manually edited CSS at the new encoded path is retained on reuse. Installation and insertion do not perform module upgrades.

See [module roundtrip validation](module-roundtrip-validation.md) for reproducible fixtures and manual acceptance steps.

## Beginner workbench resources

Project schema remains v1. An optional `id` distinguishes independent projects in the six-entry browser recent list (`mws-recent-v1`); reopening old v1 files generates an ID without rewriting their resource references. Recent entries contain full validated project snapshots, never placeholders. Valid edits are saved after a short delay, with explicit save and page-hide flush paths. **保存草稿** writes browser storage, **下载可编辑工程** downloads `.mws.json`, and export creates the delivered website. New saves use only the recent list, without duplicating assets into the legacy save key. Browser quota failures are visible and do not erase earlier records; invalid source drafts are not auto-saved.

`src/templates/portfolio/manifest.ts` declares the template ID, version, previews, pages, source and license. HTML/CSS/SVG files are separate files beside the manifest. Creating a project copies these into project files, generates fresh stable element identities, and includes `template.json` and `THIRD_PARTY_NOTICES.md`. It does not share mutable project state with the catalogue or another project.

The source files remain authoritative:

- `studio-theme.css` stores coordinated CSS custom properties, including `--ws-theme`. Template and curated blocks consume these properties. Switching a theme is one ProjectStore replacement; local `studio.css` declarations stay intact. Removing a local declaration restores the normal cascade. The panel distinguishes a generated override from theme/page styles; it does not claim general CSS cascade attribution.
- Image replacement writes a local asset plus targeted `src`/`alt` edits. Uploaded filenames are generated, paths are relative to the active page, and old resources remain available. Unsupported responsive `srcset`/`sizes` are removed explicitly by replacement, leaving layout, crop and element identity unchanged.
- Explicit `data-mws-cover` keys link a work's homepage and detail images. Linked replacement, object-fit/object-position and alt edits update those images across pages; identical URLs without a shared key do not link them. Solid covers are generated local SVG assets. Duplicated subtrees receive fresh cover keys; navigation links keep their original targets.
- `data-mws-profile="name|greeting|title"` marks template leaves for one-step Chinese name updates. Title prefixes use `data-mws-profile-prefix`; ordinary text with the same name stays untouched.
- CSS effects use `data-mws-css-effect` and one collision-safe shared stylesheet. Supported values are hover-zoom, text-outline, outline-hover and frosted. They do not modify translate or transform; applying/removing uses the same source transaction/history system.
- `data-ws-block` names selectable sections. Link selection writes a real fragment URL, assigning a section ID if needed. Block insertion uses source-position commands and the existing module CSS registry; one file is shared project-wide and referenced once by each using page.
- Fade-up settings live on the same source element: `data-mws-reveal="enter|load"`, `data-mws-duration` (100–3000 ms), `data-mws-delay` (0–3000 ms), `data-mws-distance` (0–100 px). No disconnected animation store exists. Text replacement preserves identity and these attributes.
- Applying an effect adds the trusted standalone runtime (`studio-motion.js`, or a non-colliding filename) and one page-relative script reference. Editing uses the bundled controlled implementation only, never the project copy. Explicit runtime preview and exported websites run the project script. Reduced-motion displays content directly. Removal cancels active animation and restores the original transform. The runtime uses observers with cleanup, no network or Studio dependency.

The catalog includes 31 pinned website-assets modules plus ten workbench components/blocks (some overlap with earlier adaptations). Original definitions, revisions, integrity hashes and MIT notices are kept in `src/resources/`; see [resource-sync.md](resource-sync.md). Remote synchronization and upgrades remain deferred. Saved projects retain installed module definitions and CSS rather than being overwritten by catalog updates. The two SVG covers are original MIT artwork. Custom ZIP modules continue through the strict validator; built-in effects do not expand that permission boundary.

## Built-in interactive components

The original local `workbench/tabs` and `workbench/accordion` components keep their editable structure in ordinary HTML. `data-mws-component="tabs|accordion"` selects the controlled runtime. `data-mws-default` stores the initial paired item index (accordion also accepts `-1` for all closed), and `data-mws-multiple="true|false"` controls accordion expansion. Matching tab/panel or question/answer attributes pair controls with content within each instance. Each component has its own state; nested instances are scoped independently.

Insertion adds one collision-safe `studio-interactions.js` file and one relative reference per using page. The runtime has setup/disposal, keyboard behavior and ARIA relationships; preview clicks change only runtime state, not saved defaults. The editing iframe does not execute this project script and shows every panel for editing. Explicit preview and exported HTML run the standalone script without Studio or network access. Static ZIP module validation and the deferred resource-provider contract remain unchanged.

## Single HTML and full website export

**导出网站** retains every source file and asset in a ZIP, including all pages and notices. **导出 HTML** packages only the active page using source-position patches, without modifying the project. Local stylesheet references become style elements; simple CSS imports and local URL resources are embedded. Images, fonts, media and supported SVG references become data URLs. Classic local JavaScript becomes UTF-8 data-script references, preserving defer/async behavior; inline scripts remain intact. Stable element IDs and generated overrides survive HTML reimport and re-export.

Single HTML is a bounded static exporter, not a JavaScript dependency bundler. It rejects known unsupported cases with file-specific reasons: other local HTML pages, missing/external dependencies, conditional CSS imports, responsive srcset, module/importmap scripts, embedded documents, CSP/base directives and detected runtime resource loading. Arbitrary dynamic JavaScript can construct dependencies that static analysis cannot identify. Keep the project file or use the complete ZIP for such sites. External navigation links remain navigation links. A saved `.mws.json` is the format that preserves the module registry and original editable file separation.

SVG image resources can be embedded, while `<use>` references must stay within the same document (`#id`). External or data-URL SVG `<use>` references are reported for ZIP export; converting a sprite reference to a data URL would break browsers that removed that feature ([Chrome compatibility explanation](https://developer.chrome.com/blog/migrate-way-from-data-urls-in-svg-use)).

Framework adapters, arbitrary script modules, additional templates and advanced timelines remain deferred.
