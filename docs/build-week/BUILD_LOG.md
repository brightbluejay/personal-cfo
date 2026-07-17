# Build Log

Record verified work only. Do not paste secrets, private financial information, or personal source material.

### 2026-07-17 — Evening 1 application foundation

**Objective**

- Establish a public-safe, local-first Next.js foundation with a fictional SQLite demo, responsive dashboard, tests, documentation, and a runnable `main` branch.

**Work completed with Codex**

- Verified the WSL Ubuntu, Bash, workspace, sandbox, `bwrap`, and uninitialised Git environment.
- Confirmed the existing `.git` directory was empty, removed it, and initialised `main`.
- Installed `nvm` 0.40.4, Node.js 24.18.0 LTS, and npm 11.16.0 inside WSL.
- Added Next.js, TypeScript, Tailwind CSS, SQLite, Drizzle ORM, Zod, Vitest, ESLint, and Prettier configuration.
- Created the initial 12-table schema and committed Drizzle migration.
- Implemented a guarded reset-and-seed process that reads only the supplied fictional CSV fixtures and creates an ignored local SQLite database.
- Added deterministic integer-minor-unit monthly-plan calculation and category normalisation/rules.
- Built responsive Overview, Transactions, Spending, Debts, and Monthly Review pages.
- Added seed consistency and server-render page smoke tests.
- Added an MIT Licence, setup and demo instructions, privacy boundaries, and architecture notes.
- Retained the Python prototype as a non-runtime historical reference.

**Decisions made by the builder**

- Keep Evening 1 local-first and credential-free.
- Use only the supplied fictional data and treat all repository material as public-submission content.
- Defer OpenAI, TrueLayer, production Open Banking, accounts, cloud infrastructure, payments, Docker, and native applications.
- Require WSL-local Node installation through `nvm` and a repeatable seeded demo.

**Verification performed**

- Commands: `npm run demo:reset`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run format:check`, `npm run build`, dependency audit, privacy/secret scan, staged-file review.
- Results: reset seeded 12 schema areas; lint, type-check, and formatting passed; 2 test files and 8 tests passed; production build completed with all five application routes. The working-tree privacy and secret scan returned zero findings, and the generated SQLite database was confirmed ignored.

**Evidence**

- Commit(s): none. `git add` was attempted after verification but the active sandbox mounted `.git` read-only and denied creation of `.git/index.lock`. No staged review or commit was claimed.
- Screenshot(s): none created.
- Primary thread used: yes.

**Remaining risks**

- Responsive visual behaviour still needs manual browser review because this session did not use browser automation.
- Incremental commits remain blocked until the repository metadata is writable to Git; the working tree is complete but uncommitted.
- The last successful full npm audit reported four moderate development-only advisories in the current Drizzle migration CLI dependency chain; no high or critical findings were reported. A later sandboxed audit retry could not reach the npm registry.
- Full affordability and debt strategy engines, GPT review, and any sandbox banking integration remain intentionally out of scope.
