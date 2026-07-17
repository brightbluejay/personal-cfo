# Personal CFO — Codex Project Instructions

## Purpose

Build a public-safe, local-first personal finance assistant for an OpenAI Build Week submission.

## Core product rule

**Code calculates. GPT interprets. The user decides.**

## Privacy and security

- Treat all user-supplied financial material as private.
- The public repository must contain fictional data only.
- Never copy private statements, transaction descriptions, names, locations, or household circumstances into fixtures, tests, documentation, screenshots, logs, or commits.
- Never commit `.env` files, API keys, access tokens, refresh tokens, client secrets, or user SQLite databases.
- Do not print secrets in terminal output or error messages.
- Use `.env.example` with placeholder variable names only.
- Before suggesting a commit, inspect staged changes for secrets and private data.

## Financial correctness

- Never invent balances, interest rates, payment dates, income, or expenses.
- Implement all monetary calculations in deterministic, testable code.
- GPT must not calculate balances, debt schedules, interest, payoff dates, or affordability results.
- Show assumptions behind projections.
- Preserve decimal precision for monetary values and define rounding behaviour.
- Handle promotional rates and their expiry dates explicitly.
- Do not recommend missing contractual minimum payments.
- Do not initiate payments or move money.
- The product provides planning information, not regulated financial advice.

## MVP priorities

1. Reliable fictional demo mode.
2. Local ledger and transaction browsing.
3. Deterministic categorisation rules and user corrections.
4. Safe-to-spend calculation.
5. Debt snowball and avalanche comparison.
6. GPT-5.6 categorisation fallback and monthly review.
7. TrueLayer sandbox integration only after the local path is reliable.
8. Submission documentation and a reproducible demo.

## Scope control

Do not add cloud infrastructure, multi-tenancy, payment initiation, native mobile clients, investment advice, pension planning, tax planning, receipt OCR, or production Open Banking during the hackathon MVP.

## Build Week evidence

- Keep the majority of core work in the primary Codex build thread.
- Update `docs/build-week/BUILD_LOG.md` only with work that actually happened.
- Record material human decisions in `docs/build-week/DECISIONS.md`.
- Do not invent commits, screenshots, tests, outcomes, or a `/feedback` session ID.
- Keep `main` runnable at the end of each work session.

## Completion checks

Before finishing a task:

1. run relevant tests;
2. run type checking and linting when available;
3. verify the critical user flow affected by the change;
4. inspect Git status and staged content;
5. update documentation when behaviour or setup changed;
6. state any failure or uncertainty plainly.
