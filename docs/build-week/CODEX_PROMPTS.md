# Primary Codex Thread Prompt Playbook

Use one primary Codex thread for the majority of core implementation. Keep returning to that thread throughout the build.

## First prompt

You are working in the primary Codex build thread for my OpenAI Build Week submission.

The project is **Personal CFO**, a solo entry for the **Apps for Your Life** track. The deadline is close, so scope discipline and a reliable judging journey matter more than feature breadth.

Before changing anything:

1. inspect the entire repository;
2. read `AGENTS.md` and `docs/product-spec.md`;
3. inspect the fictional CSV data and prototype script;
4. inspect `.gitignore` and `.env.example`;
5. inspect the Build Week documentation templates;
6. report the current state and any blockers.

All committed data is fictional demonstration data. Keep the public repository free of private financial records, identifying details, credentials, tokens, and user databases. Do not quote or preserve any uncommitted private source material if it is introduced later.

## Product promise

**Know what is safe. Clear what you owe.**

A judge must be able to:

1. launch demo mode;
2. inspect fictional accounts and transactions;
3. see categorised spending;
4. see income, essentials, debt minimums, and upcoming commitments;
5. calculate safe-to-spend until payday;
6. test a proposed purchase;
7. compare debt snowball and avalanche;
8. see payoff duration and interest differences;
9. generate a concise GPT-5.6 monthly review containing no more than two grounded actions.

## Engineering rules

- Code calculates.
- GPT-5.6 interprets.
- The user decides.
- Financial calculations must be deterministic, documented, and tested.
- GPT-5.6 must not invent balances, interest, payoff dates, or affordability results.
- Validate all structured model output with Zod.
- Send the model only the minimum validated context required.
- Seeded demo mode must work without OpenAI or TrueLayer credentials.
- Do not initiate payments.
- Do not add investment, tax, pension, credit-scoring, or production Open Banking features.
- Do not introduce AWS, Terraform, microservices, containers, user registration, or cloud databases for the MVP.

## Intended stack

- Next.js;
- TypeScript;
- SQLite;
- Drizzle ORM;
- Tailwind CSS;
- Zod;
- Vitest;
- Playwright;
- OpenAI Responses API using GPT-5.6;
- TrueLayer sandbox only after the local demo path works.

## Build Week evidence

- Keep the majority of core work in this thread.
- Update `docs/build-week/BUILD_LOG.md` only with verified work.
- Record material human decisions in `docs/build-week/DECISIONS.md`.
- Do not fabricate commits, tests, screenshots, results, or a `/feedback` session identifier.
- Keep the application runnable at the end of each session.

## First-session deliverable

Complete only the foundation:

1. initialise Git if needed and inspect the starting state;
2. strengthen security and privacy defaults where necessary;
3. initialise the Next.js TypeScript application in this repository;
4. configure SQLite and Drizzle;
5. create the core schema for accounts, transactions, categories, category rules, debts, income, recurring commitments, upcoming expenses, monthly plans, AI reviews, and sync connections;
6. migrate the fictional CSV fixtures into a coherent database seed;
7. build a responsive dashboard shell with Accounts, Transactions, Spending, Cash Flow, and Debts navigation;
8. add seed-consistency tests;
9. preserve or archive the Python prototype clearly so the finished app does not depend on it;
10. update setup instructions and Build Week records;
11. run the application and tests;
12. report what works, what failed, and what I must verify manually.

Do not implement live OpenAI calls or TrueLayer during this first session.

Work directly in the repository. Do not merely describe commands: run them and verify the result. Before finishing, inspect Git changes for secrets, private data, generated databases, and unintended files. Recommend a sensible commit message, but do not claim a commit exists unless it does.

---

## Reusable session-opening prompt

Continue Personal CFO in this same primary Build Week thread.

First:

1. read `AGENTS.md`;
2. read `docs/product-spec.md`;
3. read `docs/build-week/BUILD_LOG.md` and `DECISIONS.md`;
4. inspect Git status and recent commits;
5. run the existing tests;
6. confirm the repository contains no secrets, user databases, or private records;
7. summarise the current working state.

Tonight's objective is:

`[PASTE ONE OBJECTIVE FROM BELOW]`

Work directly in the repository and stay within the stated objective.

Requirements:

- preserve working functionality;
- keep fictional demo mode reliable;
- implement financial calculations in deterministic code;
- validate GPT structured output;
- add or update tests for material behaviour;
- update setup and architecture documentation when behaviour changes;
- update Build Week records honestly;
- do not fabricate evidence;
- leave the application runnable and demonstrable.

Before finishing:

1. run linting, formatting checks, type checking, tests, and the relevant user flow;
2. review changes for secrets and private data;
3. summarise files changed;
4. give exact test results;
5. identify the highest remaining risk;
6. recommend one commit message;
7. tell me what to verify manually.

## Session objective: categorisation

Implement the transaction ledger and categorisation system:

- transaction list and filters;
- monthly category summaries;
- deterministic merchant normalisation and category rules;
- user category correction;
- persistence of corrections as local rules;
- GPT-5.6 structured-output fallback for ambiguous transactions;
- provenance and confidence indicators;
- a mock GPT provider for credential-free demo mode;
- tests for deterministic categorisation.

Do not call GPT for transactions already handled confidently by local rules.

## Session objective: safe-to-spend

Implement monthly cash flow and the proposed-purchase workflow.

Calculate in code:

- current available cash;
- expected income before payday;
- essential recurring commitments;
- debt minimums;
- upcoming committed costs;
- protected cash buffer;
- safe-to-spend until payday.

Build a form accepting amount, purpose, and proposed date. Return affordable, risky, or unaffordable; the resulting buffer; the commitment at risk; and an optional GPT-5.6 explanation grounded only in the calculated result.

Test positive, zero, negative, missing-data, and boundary cases.

## Session objective: debt engine

Implement:

- debt creation and editing;
- minimum-payment baseline;
- snowball simulation;
- avalanche simulation;
- payoff month;
- total interest and total paid;
- difference in months and interest;
- extra-payment scenarios;
- promotional-rate transitions and warnings;
- a clear comparison screen and payoff chart.

Document and test assumptions about compounding, payment timing, rounding, minimum payments, and promotional-rate expiry.

## Session objective: GPT review and sandbox integration

First implement the GPT-5.6 monthly CFO review.

Supply only a validated derived summary containing income, essentials, debt minimums, exceptional spending, category changes, safe-to-spend, protected buffer, selected strategy, next target, payoff projection, and data-quality warnings.

Require structured output containing a concise summary, zero to two actions, an optional warning, and supporting calculation references. Reject unsupported figures.

Then time-box TrueLayer sandbox work:

- sandbox authorisation;
- account, balance, and transaction import;
- idempotent upsert;
- sync status and error handling;
- reliable fallback to seeded demo mode.

Do not implement production connectivity and do not let sandbox issues break the core demo.

## Session objective: submission freeze

Freeze major feature work and prepare the submission:

- verify the full demo journey;
- complete responsive, loading, empty, and error states;
- add privacy and financial-information disclosures;
- verify clean-clone setup and demo reset;
- complete README, architecture, Codex collaboration, GPT-5.6 contribution, limitations, testing, and judging instructions;
- review licence and third-party attribution;
- add a Playwright critical-flow test;
- complete Build Week records and checklist;
- draft a demo script of approximately 2 minutes 30 seconds;
- run a full secret and privacy scan.

Do not claim a requirement is satisfied unless verified.

---

## Final audit prompt

Perform a final Build Week submission audit of Personal CFO.

Do not add product features unless required to fix a submission-blocking defect.

Verify:

- working fictional demo mode;
- meaningful GPT-5.6 use;
- deterministic and tested cash-flow and debt calculations;
- no dependence on real bank credentials;
- reliable external-service fallbacks;
- public-safe repository contents;
- clear setup and judging instructions;
- appropriate licence and third-party notices;
- README explanation of Codex collaboration, human decisions, GPT-5.6 data flow, privacy, limitations, and testing;
- a demonstration path that fits within three minutes.

Run dependency validation, database creation and seed, lint, formatting checks, type checking, unit tests, integration tests, critical Playwright flow, production build, secret scan, privacy scan, and Git status review.

Update `docs/build-week/SUBMISSION_CHECKLIST.md` using only evidence-backed pass, fail, or manual-check statuses.

Return:

1. submission blockers;
2. important non-blocking issues;
3. exact commands run;
4. test results;
5. privacy and secret scan results;
6. files changed;
7. manual tasks remaining;
8. whether the repository is safe to make public;
9. a final suggested commit message.

Do not invent a `/feedback` session identifier. Remind me to run `/feedback` manually in this primary thread and save the returned identifier in private submission notes.
