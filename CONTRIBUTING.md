# Contributing

Open an issue describing the real editing case, expected source change and a minimal input project. For fixes, include a failing example and a focused regression test. Please avoid copyrighted website assets unless their license permits redistribution.

Run `npm ci`, `npm run check`, and `npm run build`. Run `npm run test:e2e` after `npx playwright install chromium` for canvas, import/export or Monaco changes. A PR should explain the source behavior, validation results and any unsupported cases.

Core modules live in `src/core/`; iframe projection and bridge in `src/preview/`; React panels in `src/components/` and `src/App.tsx`. Keep parsing/command logic independent of React. Resource cleanup and export equivalence are acceptance criteria for future animation/3D modules.
