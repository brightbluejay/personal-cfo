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

### DEC-005 — Adopt a deterministic CFO loop for Phase 1

- **Date:** 2026-07-17
- **Status:** accepted
- **Context:** The builder approved a Phase 1 direction centred on observe, diagnose, explain, recommend, and simulate rather than a generic dashboard.
- **Decision:** Extend the local-first ledger with deterministic baseline, cash-pressure, recovery, scenario, transfer, savings, and funding-envelope logic. Preserve the existing Evening 1 foundation and signed history.
- **Consequences:** Matched transfers and designated savings have explicit non-consumption semantics; uncertain movements remain visible rather than being silently reconciled. GPT remains a future structured interpretation layer only.
- **Human judgement involved:** The builder selected this product direction and supplied the additional transfer/envelope correctness requirement before implementation.

### DEC-006 — Use one dated CFO result across the product

- **Date:** 2026-07-17
- **Status:** accepted
- **Context:** Manual product-owner review found contradictory month-end, safety-cushion, recovery, debt, and purchase-scenario messages.
- **Decision:** Start from the as-of accessible balance, apply only future dated events, track the lowest balance as well as month-end, and derive every user-facing position from that result. Past spending and paid debt minimums are not deducted again.
- **Consequences:** A positive month-end can coexist with a temporary projected overdraft, but safe-to-spend and optional debt overpayment remain zero until that low point is resolved. Protected debt minimums cannot become action-plan reductions.
- **Human judgement involved:** The builder required this final Phase 1 correction pass and set the ordering, terminology, demo boundary, and completion tests.

### DEC-007 — Keep ingestion outside the correction pass

- **Date:** 2026-07-17
- **Status:** accepted
- **Context:** The public demo needs a clear explanation of where its data comes from without presenting non-functional controls.
- **Decision:** Retain the resettable fictional seed as the only current ingestion path. Document local private CSV import as the first post-hackathon capability and consent-based Open Banking as later work.
- **Consequences:** No upload, manual-entry, connection, or visitor-data storage UI is shown. Future ingestion must produce the same normalised ledger records used by the CFO domain.
- **Human judgement involved:** The builder explicitly set the ingestion roadmap and prohibited implementation during this pass.

### DEC-008 — Define health from the worst dated cash position

- **Date:** 2026-07-18
- **Status:** accepted
- **Context:** The manual review found that a positive month-end figure could obscure a material pre-income overdraft and the amount of income consumed repairing it.
- **Decision:** Use one ordered deterministic health rule based on month-end, the lowest dated balance, the safety cushion, and the next confirmed income. Lead with the pre-income low whenever an overdraft is projected, and allocate the next income into mutually exclusive buckets.
- **Consequences:** The demonstration is classified as an overdraft cycle even though month end is positive. Salary/payday wording is used only when the income row is explicitly classified as salary. Allocation reconciliation is tested to prevent double counting.
- **Human judgement involved:** The builder required a risk-first cash journey and supplied the correctness criteria; Codex translated them into the documented deterministic rule.

### DEC-009 — Add a bounded debt trajectory before full strategy comparison

- **Date:** 2026-07-18
- **Status:** accepted
- **Context:** The product needed to explain whether debt is improving and show a credible route out without inventing historical activity or overpromising a full snowball/avalanche engine.
- **Decision:** Store explicit fictional debt snapshots, show recorded payments/interest/new borrowing, and calculate a minimum-payment trajectory plus a separately labelled £200 monthly-extra scenario. Apply promotional and post-promotional rates by date.
- **Consequences:** Debt growth despite payment is visible and attributable to recorded activity. Projections state rounding and no-new-borrowing assumptions. Full snowball/avalanche comparison remains future work.
- **Human judgement involved:** The builder approved the minimum trajectory requirement and required missing data to remain missing rather than inferred.

### DEC-010 — Keep GPT interpretation optional and fact-referenced

- **Date:** 2026-07-18
- **Status:** accepted
- **Context:** A narrow CFO brief can improve clarity, but the local demo must work without credentials and GPT must not become a financial calculator.
- **Decision:** Use the Responses API with `gpt-5.6-sol`, `store: false`, and strict JSON Schema output. Send only the derived fictional fact packet; require every claim to cite allowed fact IDs; fall back to deterministic wording for no key, API failure, malformed output, or invalid references.
- **Consequences:** The judging path remains credential-free. The integration has no chatbot, raw-transaction prompt, payment action, or authority to alter deterministic outcomes. Live API wording still requires manual verification with a local key.
- **Human judgement involved:** The builder requested the bounded GPT-5.6 brief and fallback behaviour. Codex selected the documented Responses/Structured Outputs implementation from current official OpenAI guidance.

### DEC-011 — Ground two distinct narratives in one canonical fact package

- **Date:** 2026-07-18
- **Status:** accepted
- **Context:** The deterministic engine must remain authoritative, while Overview needs a concise CFO Brief and Your Action Plan needs warmer kitchen-table coaching informed by realistic household history.
- **Decision:** Add three complete months of fictional coaching history without feeding those extra rows into the already-approved forecast calibration. Build one versioned, hashed fact package and expose view-specific fact allowlists to two strict narrative types. Cache validated model output by all inputs that can change its meaning.
- **Consequences:** The cash and debt results remain unchanged, GPT receives no raw ledger rows, every response section is grounded in supplied fact IDs, and the credential-free fallback remains the reliable judging path. The cache automatically misses after fact, scenario, model, prompt, or schema changes.
- **Human judgement involved:** The builder supplied the household shape, tone, correctness boundary, two-evening priority order, and requirement to preserve the existing deterministic engine. Codex implemented the scoped data, fact, SDK, validation, cache, and fallback design in the primary thread.

### DEC-012 — Separate the immediate bridge from the recurring break-cycle plan

- **Date:** 2026-07-18
- **Status:** superseded by DEC-013
- **Context:** The corrected cash journey was consistent, but the Action Plan still did not answer how much monthly improvement is required, which supported changes form a workable recurring plan, or whether that plan closes the gap.
- **Decision:** Preserve the approved forecast and calculate a separate recurring target: the amount needed to restore the safety cushion plus the currently unfunded irregular-cost provision, added once. Treat existing savings only as immediate timing support. Select no more than five recurring changes in deterministic priority order: high-confidence subscription candidates first, then the largest supported trims from changeable categories without crossing their protected floors.
- **Consequences:** The demonstration plan produces £634.04 gross monthly savings, allocates £205.00 to irregular costs, provides £429.04 net improvement, covers 23.8% of the £1,803.00 target, and honestly reports a £1,373.96 shortfall. Required debt payments and protected categories remain unchanged. Because the plan is partial, its milestones carry exact shortfalls but no invented dates, and no optional debt-overpayment date is introduced.
- **Human judgement involved:** The builder required strict P0/P1/P2 ordering, a five-item Action Plan allowance, explicit irregular-cost handling, and a stop after the time-boxed P1 work. Codex implemented P0 and the narrow P1 milestone/tests; debt-effect re-dating and the wider test matrix were intentionally skipped as P2.

### DEC-013 — Separate recurring flow from one-off recovery stock

- **Date:** 2026-07-18
- **Status:** accepted
- **Context:** Product-owner audit found that the prior £1,803 monthly target mixed a temporary £1,348 pre-income low and £250 cushion stock with a recurring £205 provision. Category reductions also exceeded the supported flexible share of one typical month because they were capped only by projected spending above the floor.
- **Decision:** Model the existing recurring cycle before the new provision, fund the provision once through the new plan, and permit only a positive post-plan monthly balance to reduce the one-off backlog. Derive every category trim from the arithmetic mean of three individual complete months and cap it at both the supported flexible share and the amount above the protected floor. Keep same-day comparisons diagnostic only.
- **Consequences:** The existing recurring gap is £152.20. Corrected selected actions save £238.65 gross; funding £205.00 leaves £33.65 net improvement and a £118.55 recurring shortfall. The £1,348 amount to zero plus £250 cushion remains a £1,598 one-off stock; immediate actions reduce it to £1,308, but the remaining recurring shortfall leaves no monthly backlog-reduction capacity or supported dates. Optional debt-effect re-dating remains deferred.
- **Human judgement involved:** The builder required a strict derivation audit before edits, P0 completion before P1, a time-boxed ceiling-division milestone fallback, and no broad test matrix or revised debt-free date in this pass.

### DEC-014 — Redirect future savings contributions before creating new monthly headroom

- **Date:** 2026-07-18
- **Status:** superseded by DEC-015
- **Context:** The corrected monthly model included £200 of confirmed future sinking-fund contributions and separately attempted to create £205 of new room for recurring surprise costs. The selector also left feasible candidates at zero without typed reasons and did not explain the single-observation Stream House charge.
- **Decision:** Treat the four confirmed contributions as one user-confirmed temporary redirection choice, not as a cancelled expense or new income. Reassign up to £200 to the £205 surprise-cost pot, expose the remaining new requirement, retain every subscription and flexible-category choice with a stable rank and typed selection outcome, and count the redirect within the five-item decision limit. Prefer the redirect, then confirmed subscriptions, then the strongest supported flexible trim. Ordinary saving may be reconsidered only after a complete healthy month, while the surprise-cost pot and every required debt payment remain protected.
- **Consequences:** The selected plan redirects £200, newly sets aside £5, and stops or reduces £188.77 through three confirmed subscription choices and the groceries trim. It leaves a £31.57 normal-month surplus. The earlier £81.45 sanity result would require keeping the prior £238.65 of reductions as well, which would create a sixth plan item and conflict with the explicit cap. Stream House remains visible but unselected because only one charge is observed; eating out, leisure, and coffee remain feasible but outside the five-item plan. The month-by-month projection reaches above zero in May 2029, restores the cushion in January 2030, completes the first healthy month and reviews the redirect in February 2030, and permits a conditional £31.57 optional payment from March 2030.
- **Human judgement involved:** The builder required the temporary redirect to be a choice, required current-purpose/access restrictions to remain questions rather than assumptions, set the five-item priority order, required every unselected choice to have a typed reason, and required `kitchen-table-v7` to replace internal accounting language with ordinary prose.

### DEC-015 — Keep redirects outside the spending cap and rank eligible changes by value

- **Date:** 2026-07-18
- **Status:** accepted
- **Context:** Counting the £200 redirect as one of five spending changes retained a £4.99 subscription choice while excluding a supported £49.88 eating-out reduction. The redirect changes the purpose of an existing outflow and is not a conventional spending reduction.
- **Decision:** Select an eligible user-confirmed redirect independently of a separate maximum of five spending changes. Rank otherwise eligible, non-conflicting, high-confidence subscriptions and flexible-category trims together by supported recurring monthly value, highest first, with a stable action-ID tie-breaker. A lower-value item may outrank a higher-value item only when the higher-value item has a typed protection, confidence, duplication, or incompatibility exclusion.
- **Consequences:** The seeded plan contains one cap-exempt redirect plus five counted changes: groceries, eating out, DD PUREGYM, leisure, and coffee. Netflix and Cloudy Digital remain visible with `maximum_item_limit`; Stream House remains visible with `insufficient_recurrence`. Gross spending reductions are £249.66, £200 is redirected to the £205 surprise-cost pot, £5 is genuinely new, and the normal month has a £92.46 surplus. This is £11.01 above the rough £81.45 sanity result because leisure and coffee together exceed Netflix and Cloudy Digital by £11.01 under the required cross-kind value ordering.
- **Human judgement involved:** The builder explicitly made the redirect cap-exempt, required value-aware cross-kind ranking, required no silent inferior selection, and allowed lower-value precedence only for documented safety or eligibility reasons.

### DEC-016 — Validate documented prose equivalents without weakening fact grounding

- **Date:** 2026-07-18
- **Status:** accepted
- **Context:** A reachable `cfo_brief` response passed provider schema parsing but the fail-fast local validator discarded the exact semantic failure. The validator also admitted positive renderings of negative facts, used substring bans, and rejected exact pennies for every non-subscription amount.
- **Decision:** Keep strict per-field fact and action references while accepting only exact currency, deterministic half-up whole-pound currency, explicitly negative phrasing for negative facts, and natural dates that resolve unambiguously to cited ISO facts. Require exact pennies for named subscription actions. Match prohibited prose with word/phrase boundaries and collect bounded, secret-sanitised diagnostics for every validation failure.
- **Consequences:** Response schema `cfo-narrative-v7` distinguishes model defects from validator, fact-index, schema, and banned-language defects. Unknown amounts, changed signs, combined facts, unknown dates, unsupported actions, excess actions, and internal taxonomy remain rejected. The original rejected prose cannot be reconstructed because it was neither cached nor retained; later controlled attempts now expose complete safe diagnostics.
- **Human judgement involved:** The builder approved only documented equivalence tolerance, reset the controlled generation ceiling to two, and prohibited changes to calculations, selection, milestones, seed data, design, and fallback copy.
