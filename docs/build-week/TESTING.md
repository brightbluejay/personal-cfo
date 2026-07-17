# Testing Record

Record exact commands and verified results. Do not claim a test passed unless it was run successfully.

## Prototype

```bash
python scripts/finance_report.py
```

## Web application — Evening 1

Commands implemented:

```bash
npm run demo:reset
npm run lint
npm run typecheck
npm test
npm run format:check
npm run build
npm start
```

The seed tests create temporary SQLite databases, apply the committed Drizzle migration, and verify fixture row parity, category and foreign-key integrity, and the monthly-plan equation. Browser automation is not part of the Evening 1 foundation and must not be marked complete.

### Verified results — 2026-07-17

- `npm run demo:reset`: passed; migrated and seeded all 12 schema areas.
- `npm run lint`: passed with zero warnings after configuration cleanup.
- `npm run typecheck`: passed.
- `npm test`: passed; 2 files and 8 tests, including five SQLite-backed server-render page cases.
- `npm run build`: passed with Next.js 16.2.10 using the workspace-compatible Webpack builder; Overview, Transactions, Spending, Debts, and Monthly Review routes were emitted.
- `npm audit --json`: the last successful full audit reported four moderate development-only findings in the Drizzle CLI's legacy loader chain, with no high or critical findings. The earlier production PostCSS finding was removed with a patched dependency override.
- `npm audit --omit=dev --json`: a later sandboxed retry could not reach the npm registry and produced no new audit result.

The first format check correctly identified the previously unfinished Build Log and the generated Python report. The Build Log was completed; generated reports are excluded from Prettier because their generator is authoritative. The final `npm run format:check` passed.
