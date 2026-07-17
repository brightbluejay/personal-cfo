# Personal CFO

**Know what is safe. Clear what you owe.**

Personal CFO is a public-safe, local-first planning assistant for cash-flow clarity and consumer-debt reduction. The current foundation provides a responsive Next.js dashboard backed by a fictional SQLite ledger. Deterministic code owns every monetary calculation; future GPT features will interpret validated facts rather than calculate them.

> All committed records are fictional demonstration data. The application provides educational planning information, not regulated financial advice.

## Evening 1 foundation

The working demo includes:

- a local SQLite database managed with Drizzle ORM;
- repeatable reset-and-seed from the committed fictional CSV fixtures;
- accounts, transactions, categories, category rules, debts, income, recurring commitments, upcoming expenses, sinking funds, monthly plans, AI review, and sync-connection schema areas;
- responsive Overview, Transactions, Spending, Debts, and Monthly Review pages;
- fictional account, transaction, category-spending, commitment, and debt summaries;
- a deterministic initial monthly-plan calculation;
- consistency tests for seed coverage, category links, foreign keys, and the cash-flow equation.

OpenAI calls, TrueLayer, user accounts, cloud services, and payment initiation are deliberately not implemented in this foundation.

## Requirements

- WSL or Linux with Bash
- Node.js 24 LTS and npm, installed through `nvm`

Install and select the current LTS with `nvm`:

```bash
nvm install --lts
nvm use --lts
```

## Setup and demo

```bash
npm install
npm run demo:reset
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The demo does not require credentials or an `.env` file.

Reset the local demo at any time:

```bash
npm run demo:reset
```

This removes only the configured generated SQLite file inside `data/`, reapplies committed migrations, and reseeds it from the fictional CSV fixtures. SQLite files and their journal files are ignored by Git.

## Development commands

```bash
npm run lint
npm run typecheck
npm test
npm run format:check
npm run build
npm start
```

Generate a migration after intentionally changing the schema:

```bash
npm run db:generate
```

## Architecture

- `app/` — Next.js App Router pages and global styling
- `components/` — responsive dashboard shell and reusable interface components
- `src/db/schema.ts` — typed Drizzle schema
- `src/db/seed.ts` — deterministic fixture-to-database mapping and plan calculation
- `src/db/reset.ts` — guarded reset, migration, and seed command
- `src/db/queries.ts` — read-only dashboard queries and summaries
- `drizzle/` — committed SQL migrations
- `tests/` — seed consistency tests using temporary databases
- `data/` — fictional CSV source fixtures; generated databases remain ignored

SQLite is the local source of truth at runtime. The reset command derives its database exclusively from committed fictional fixtures. No external service is needed for the judging path.

## Calculation boundary

The initial monthly plan uses integer minor currency units and the following code-owned equation:

```text
opening cash + confirmed income
- confirmed unpaid recurring commitments
- contractual debt minimums
- confirmed upcoming expenses
- sinking-fund contributions
- protected buffer
```

Safe-to-spend is floored at zero. Later sessions will expand and test the full affordability and debt strategy engines; GPT will not calculate or modify those figures.

## Privacy and public-repository boundary

Never commit:

- bank statements, real transactions, balances, or personal circumstances;
- account or card identifiers;
- SQLite user databases;
- API keys, tokens, client secrets, or `.env` files;
- private imports, screenshots, logs, or generated reports containing user data.

Use `data/private/` only for ignored local work. Before every commit, inspect staged files and scan for secrets and identifying material.

## Python prototype decision

The conservative Python report generator remains in `scripts/` as historical reference. The Next.js application does not call it and the seeded web demo does not depend on Python. This avoids deleting useful foundation evidence while keeping one clear runtime path.

## Licence

The project uses the [MIT Licence](LICENSE). It permits use, modification, redistribution, and commercial reuse when the licence and copyright notice are retained. It provides no warranty and does not require derivative projects to publish their source.

## Build Week evidence

Verified work, human decisions, test evidence, and Codex collaboration notes live in `docs/build-week/`. A `/feedback` session identifier must be collected manually and is never fabricated.
