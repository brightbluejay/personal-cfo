# Personal CFO

**Know what is safe. Clear what you owe.**

Personal CFO is a public-safe, local-first planning assistant for cash-flow clarity and consumer-debt reduction. The application provides a responsive Next.js dashboard backed by a fictional SQLite ledger. Deterministic code owns every monetary calculation; an optional GPT-5.6 brief can interpret only the validated facts supplied by that code.

> All committed records are fictional demonstration data. The application provides educational planning information, not regulated financial advice.

## Evening 1 foundation and Phase 1 CFO loop

The working demo includes:

- a local SQLite database managed with Drizzle ORM;
- repeatable reset-and-seed from the committed fictional CSV fixtures;
- accounts, transactions, categories, category rules, debts, debt snapshots, income, recurring commitments, upcoming expenses, sinking funds, monthly plans, AI review, and sync-connection schema areas;
- responsive Overview, Transactions, Spending, Debts, and Your Action Plan pages;
- fictional account, transaction, category-spending, commitment, and debt summaries;
- one dated cash forecast with the current position, pre-income low, next-income allocation, month-end position, days below zero, and deterministic health classification;
- consistency tests for seed coverage, category links, foreign keys, transfers, forecast invariants, recovery protection, scenarios, and rendered routes;
- deterministic transfer reconciliation with account ownership/role metadata, stable evidence references, confidence/status, and unresolved one-sided savings movements;
- comparable-month routine-spending baselines and anomaly signals that exclude matched transfers;
- funding-envelope accounting that distinguishes funding allocation, eligible spending, fallback spend after exhaustion, and effective spend;
- a deterministic cash-pressure diagnosis, protected-category recovery options, local purchase scenario simulator, spending-pressure summary, and supported repeated-pattern detection;
- debt snapshots, current-plan payoff projection, post-promotion rate handling, and a clearly labelled £200-per-month alternative scenario;
- staged financial-health milestones from now to debt-free;
- an evidence-backed CFO Brief and Action Plan coaching layer with deterministic no-key fallbacks, optional GPT-5.6 Sol wording through the Responses API, and versioned local caching.

TrueLayer, user accounts, cloud services, payment initiation, and user-data import are deliberately not implemented. The optional OpenAI request sends only the fictional derived fact packet, uses structured output, disables response storage in the request, and never performs financial calculations.

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

To test optional GPT wording, copy `.env.example` to an ignored `.env.local`, set `OPENAI_API_KEY` locally, restrict the file to the local user with `chmod 600 .env.local`, and restart the application. Both Next.js and the pre-generation command load `.env.local`. Without a key—or if the response is unavailable or fails schema, reference, wording, quantified-claim, or scenario validation—the same endpoint returns the deterministic brief. Never commit `.env.local` or a key.

To pre-generate and cache both model-written narratives after resetting the demo:

```bash
npm run demo:reset
npm run demo:generate-briefs
```

The pre-generation command requires `OPENAI_API_KEY`. It sends only the validated fictional fact views, writes validated responses to the ignored local SQLite database, and prints version/hash metadata rather than the prompt payload or credential. A later fact-package, scenario, model, prompt, or response-schema change produces a different cache key.

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
- `src/db/cfo-query.ts` — local read model for the deterministic CFO loop
- `src/domain/cfo/` — transfer, baseline, envelope, forecast, diagnosis, recovery, scenario, spending, milestone, debt-projection, canonical narrative facts, validation, and deterministic fallback logic
- `src/server/openai/` — server-only prompt and official OpenAI SDK boundary
- `src/server/narrative-cache.ts` — validated, versioned local narrative cache
- `src/server/generate-demo-narratives.ts` — optional pre-generation command
- `drizzle/` — committed SQL migrations
- `tests/` — seed consistency tests using temporary databases
- `data/` — fictional CSV source fixtures; generated databases remain ignored

SQLite is the local source of truth at runtime. The reset command derives its database exclusively from committed fictional fixtures. No external service is needed for the judging path.

## Canonical calculation boundary

The application starts from the accessible account balance on the planning date. It then applies only future, confirmed, dated income and obligations through month end, plus recent usual spending still expected after that date. Past transactions already reflected in the current balance are not deducted again.

The shared CFO result contains:

- projected month-end balance;
- lowest projected balance/date, days below zero, and projected overdraft;
- the next confirmed income's type, date, balance before/after, negative balance cleared, and reconciled allocation;
- a documented deterministic financial-health classification;
- safety cushion and the amounts needed to avoid overdraft or restore that cushion;
- safe-to-spend now;
- required, paid, and remaining debt minimums;
- safe optional debt payment and deterministic payoff trajectory;
- forecast after the two-action plan.

Safe-to-spend is zero whenever a new purchase would deepen a projected overdraft or use the safety cushion. Required debt minimums are protected and can never become recovery actions. Debt projections use integer minor units, monthly rounded interest, recorded minimums and explicit promotional expiry rates; they assume no later fees, missed payments or new borrowing. Full snowball/avalanche comparison remains later work. GPT cannot calculate or modify any figure.

## Phase 1 CFO calculation boundary

Phase 1 follows **observe → diagnose → explain → recommend → simulate**. It compares routine spending with comparable fictional months, projects confirmed obligations, distinguishes accessible cash from designated savings, and produces optional recovery actions from flexible or limited categories only. Purchase scenarios retain the safety-cushion rule and are not evaluated until a positive amount and valid date are supplied.

Transfers use equal/opposite amounts, a three-day date window, owned-account eligibility, metadata/reference signals, and stable evidence IDs. High-confidence matched transfers stay in account timelines but are not treated as income, consumption, anomalies, or leakage. One-sided probable savings movements remain explicitly unresolved rather than being silently reconciled. A spending-account allocation is not spend; its envelope reports actual eligible spending plus qualifying fallback spending after exhaustion.

The model boundary is deliberately narrow: code sends only a view of the validated canonical fact package, never raw ledger rows. Code also formats monetary and percentage values before they cross that boundary, so GPT never converts raw minor units. The official JavaScript SDK calls the Responses API with `gpt-5.6-sol`, `store: false`, a 60-second request bound with at most one retry, and a strict Zod-backed structured format. Every returned section must reference allowed fact IDs; Overview actions are capped at two choices, while Action Plan coaching may use one temporary redirect plus no more than five selected spending changes. The `kitchen-table-v7` contract requires one cited human observation, natural dates, and ordinary language rather than internal accounting taxonomy. A cited monetary claim may use the exact fact value or deterministic half-up whole-pound rounding; negative facts must retain their sign unless explicit wording such as “overdrawn” carries the negative meaning, and named subscription actions retain exact pennies. A yearless natural date is accepted only when the cited facts resolve it to one ISO date. User-facing output is rejected when it contains banned implementation language, unsupported quantified claims, unknown dates, ISO dates, fake intimacy, more than one observation field, markup, a misleading savings-redirect claim, or a deterministic scenario contradiction. A missing key, API failure, malformed response, or invalid output uses the deterministic fallback. Valid model responses are cached in local SQLite by fact-package hash, narrative type, scenario, model, prompt version, and schema version. The integration follows the official [GPT-5.6 Sol model](https://developers.openai.com/api/docs/models/gpt-5.6-sol), [Responses API](https://github.com/openai/openai-node), and [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs) guidance.

Your Action Plan separates the normal month from the one-time hole left by the current overdraft cycle. It shows the fully covered month before changes, money stopped or reduced, money redirected, money newly set aside, the resulting monthly surplus or shortfall, and the amount available to repair the existing hole. The seeded plan proposes—subject to user confirmation—temporarily redirecting £200 of confirmed future savings contributions to cover £200 of the £205 surprise-cost pot. This changes the purpose of money already leaving the account; it is neither new income nor a £200 saving, is separate from the immediate choice about the existing savings balance, and does not consume one of the five spending-change slots. Otherwise eligible high-confidence spending changes are ranked by supported recurring monthly value with a stable action-ID tie-breaker. Every unselected feasible choice remains visible with a stable rank and typed reason; limited-history subscriptions also remain visible rather than silently disappearing. Positive monthly capacity drives a month-by-month milestone and delayed optional-debt-payment projection, while required debt payments remain protected.

## Data source and ingestion roadmap

The current public application is a resettable demonstration backed by preloaded fictional CSV fixtures. Those files are internal demo seed inputs; they are not a user-facing statement importer. The application has no file upload, manual transaction entry, visitor-data storage, bank connection, or Open Banking capability.

The CFO domain consumes normalised accounts, transactions, movement classifications, and reconciliation records. It is independent of how those records arrive. The intended roadmap is:

1. Current hackathon demo: resettable fictional ledger seeded from repository fixtures.
2. First private-use capability: local CSV statement import with account selection, column mapping, date and amount normalisation, duplicate detection, transfer reconciliation, uncertain-classification review, and storage in an ignored local SQLite database. This is not implemented yet.
3. Later connected capability: consent-based Open Banking synchronisation through a suitable provider. This is not implemented yet.

Every future ingestion path must produce the same normalised records consumed by the existing CFO engine.

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
