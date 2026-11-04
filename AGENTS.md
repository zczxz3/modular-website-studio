# Engineering rules

- Implement actual browser/source behavior. Never replace the editing contract with screenshots or disconnected demo state.
- Source files are authoritative. All persistent visual edits go through commands and transactions.
- Do not serialize the whole imported HTML for a small edit. Preserve source bytes and stable identities.
- Editing iframe must remain opaque-origin and must never execute project scripts. Runtime preview is a separate explicit mode.
- Distinguish computed styles from source declarations and generated overrides.
- Unsupported constructs require visible boundaries; never silently discard source during import/export.
- Run `npm run check` and `npm run build` for core changes. Run relevant browser E2E tests when browser infrastructure permits; record actual results and limitations.
- Never call a test passed when it was merely written. Preserve honest alpha scope in README and roadmap.
- No deployment or AI/API service is required for the editor's static MVP.
