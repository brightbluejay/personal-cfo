# Decision Log

Record meaningful product, engineering, design, privacy, and scope decisions.

## Recorded decisions

### DEC-001 — Keep the first session local-first

- **Date:** 2026-07-17
- **Status:** accepted
- **Context:** Evening 1 requires a reliable, credential-free judging path.
- **Decision:** Use Next.js, TypeScript, Tailwind CSS, SQLite, and Drizzle. Defer OpenAI, TrueLayer, cloud infrastructure, accounts, and payment features.
- **Alternatives considered:** External banking and cloud services were explicitly out of scope for this session.
- **Consequences:** The demo is reproducible offline after dependency installation and all runtime financial records stay local.
- **Human judgement involved:** The builder set the scope, stack, privacy boundary, and excluded features in the session brief.

### DEC-002 — Treat CSV fixtures as the demo source

- **Date:** 2026-07-17
- **Status:** accepted
- **Context:** Existing fictional CSV fixtures must seed a coherent SQLite ledger without duplicating records into source code.
- **Decision:** Parse the committed CSV files during `npm run demo:reset`, apply a committed migration, and create an ignored SQLite database.
- **Alternatives considered:** Committing a prebuilt database or hard-coding fixture records in TypeScript.
- **Consequences:** Fixture changes are testable, reset is repeatable, and no generated database belongs in Git.
- **Human judgement involved:** The builder required use of only the supplied fictional data and prohibited committing SQLite databases.

### DEC-003 — Retain the Python prototype as reference

- **Date:** 2026-07-17
- **Status:** accepted
- **Context:** The existing prototype could be retained, archived, or removed.
- **Decision:** Retain it in `scripts/` as historical reference; the web application has no runtime dependency on it.
- **Alternatives considered:** Delete it or move it into a separate archive directory.
- **Consequences:** Earlier work remains inspectable without creating a second supported application path.
- **Human judgement involved:** The builder explicitly allowed retention; Codex selected the least-destructive option.

### DEC-004 — Apply the MIT Licence

- **Date:** 2026-07-17
- **Status:** accepted for the repository foundation
- **Context:** A repository-level licence was required after explaining practical implications.
- **Decision:** Use MIT: reuse, modification, redistribution, and commercial use are allowed when the notice is retained; the software has no warranty and downstream source disclosure is not required.
- **Alternatives considered:** Apache-2.0 for more explicit patent terms and copyleft licences for reciprocal source requirements.
- **Consequences:** The submission has a familiar low-friction open-source licence. The builder should still confirm this choice before publication.
- **Human judgement involved:** Codex made the documented recommendation in response to the builder's request; publication remains the builder's decision.
