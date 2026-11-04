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
