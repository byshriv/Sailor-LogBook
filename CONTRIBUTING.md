# Contributing

Use Node 24.22.0 and npm 11.19.1. From a clean checkout run `npm ci`,
`npm run check`, `npm test`, `npm run format:check`, `npm run scan:secrets`,
`node scripts/freeze-demo.cjs` and `npm run verify:foundation`.
`npm run dev:foundation` serves the isolated preview on port 5173; `npm run dev`
serves the frozen product's working source on port 4173. Keep these origins separate.

Read LAUNCH-DECISIONS.md and the current PHASE-HANDOFF.md before choosing work.
Work one phase at a time. Phase 1 code is a feasibility proof, not a ready migration.
Do not deploy it over the demo, import personal data into examples, or modify
reference/demo-v8. Packages depend only on the directions in docs/adr/0001-foundation.md.

Run `npm run format:foundation` for new foundation code/docs. Demo source is deliberately
excluded so a tooling change does not reformat the legacy product. Use small reviewable
changes with meaningful failure/recovery tests for data changes. Report actual device
coverage separately from mocks. Preserve original artwork and font/license notices.

Public source and ordinary reports use [byshriv/Sailor-LogBook](https://github.com/byshriv/Sailor-LogBook).
Do not place security reports or personal backups in a public issue; see SECURITY.md.

For isolated browser checks run `npx playwright install chromium firefox webkit`, then
`npm run test:browser`. These use disposable headless profiles, never a personal browser.
Linux CI runs all three engines; a Windows Firefox launch failure is documented separately.
WebKit simulation is not actual Safari acceptance. For Android proof builds use JDK 21 /
Android SDK 36, `npm run build:foundation`, `npm run sync:android`, then the app-scoped
Gradle tasks in .github/workflows/ci.yml. Do not run upstream dependency instrumented suites.
