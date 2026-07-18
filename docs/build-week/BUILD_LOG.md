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
- Created the initial 12-table schema and generated the Drizzle migration.
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

- Codex commands: `npm run demo:reset`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run format:check`, `npm run build`, dependency audit, and privacy/secret scan.
- Results: reset seeded 12 schema areas; lint, type-check, and formatting passed; 2 test files and 8 tests passed; production build completed with all five application routes. The working-tree privacy and secret scan returned zero findings, and the generated SQLite database was confirmed ignored.
- Git review: after the Codex workspace-write sandbox prevented writes to `.git`, the builder manually reviewed the working tree, staged the files, and created the commits from a normal WSL terminal.

**Evidence**

- Commit(s): `663e063` project foundation; `fd5ca5e` local-first dashboard; `a68634a` SQLite ledger and fictional demo seed; `91f0bee` seeded-ledger and route tests; `7f8ed0a` generated report handling.
- Screenshot(s): none created.
- Primary thread used: yes.

**Remaining risks**

- Responsive visual behaviour still needs manual browser review because this session did not use browser automation.
- The last successful full npm audit reported four moderate development-only advisories in the current Drizzle migration CLI dependency chain; no high or critical findings were reported. A later sandboxed audit retry could not reach the npm registry.
- Full affordability and debt strategy engines, GPT review, and any sandbox banking integration remain intentionally out of scope.

### 2026-07-17 — Phase 1 deterministic CFO loop

**Objective**

- Add the approved observe → diagnose → explain → recommend → simulate flow without altering the established Git history or introducing external services.

**Work completed with Codex**

- Extended the local schema and fictional seed process with account ownership, account roles/purpose, envelope category scope, transaction movement type, counterparty links, external references, category flexibility, a planning as-of date, comparable fictional history, an unavoidable one-off, one-sided savings signals, and a funding-envelope example.
- Generated the follow-on Drizzle migration for those local fields.
- Implemented deterministic transfer reconciliation using equal/opposite amounts, a three-day matching window, owned-account checks, metadata/reference signals, stable group/evidence IDs, confidence/status, and unresolved one-sided movements.
- Implemented transfer-aware routine baselines, anomaly detection, accessible-cash forecasting, ranked diagnosis, protected-category recovery actions, funding-envelope calculations, and a local purchase scenario simulator.
- Added validated Zod fact/interpretation contracts for a future model boundary. No model call, credential, or network dependency was added.
- Updated Overview, Spending, Transactions, and Monthly Review to present the CFO loop and its deterministic boundaries.
- Added seed metadata coverage and transfer/envelope correctness tests, including matched-transfer exclusion, savings uncertainty, rejected movements, evidence references, and fallback envelope spending.

**Verification performed**

- `npm run demo:reset` completed and seeded the ignored local demo database across 12 schema areas.
- `npm run lint`, `npm run typecheck`, `npm test`, and `npm run format:check` passed. The test run completed 3 files and 13 tests.
- `npm run build` completed successfully and included Overview, Transactions, Spending, Debts, and Monthly Review routes.
- A production-server smoke attempt was blocked by the workspace sandbox with `listen EPERM` on port 3000; server-render route tests passed, but browser/runtime review remains manual.
- Workspace privacy/secret scan found no credential assignment outside ignored Git hook samples. Git inspection confirmed generated databases, dependency directories, build output, and reports were not tracked.

**Collaboration and Git**

- Codex made workspace-scoped implementation and verification changes in the primary thread. The builder previously established that Git staging and commits are performed manually from the normal WSL terminal because the Codex sandbox protects `.git`.
- No Git commit was created or changed during this continuation.

**Remaining risks**

- Transfer confidence is intentionally heuristic and should receive wider synthetic-fixture coverage before any real-data import path is considered.
- The local runtime server cannot be opened from this sandbox, so responsive browser review and interactive scenario-control review require a normal WSL browser session.

### 2026-07-17 — Final Phase 1 product-owner correction pass

**Objective**

- Resolve the contradictions found during manual product review and reshape the interface around position, causes, actions, improvement, debt, and purchase decisions.

**Root causes corrected**

- Overview and Monthly Review used different calculations: the older monthly-plan row reported safe-to-spend while the newer forecast deducted past spending again and included obligations outside July.
- The current balance already reflected recorded purchases and debt payments, but those amounts were subtracted a second time.
- Debt-payment transactions lacked a protected movement classification and therefore appeared in the recent-spending reduction pool.
- The scenario evaluated its initial zero value and could label that non-purchase safe even when maximum safe spending was zero.
- An already-recorded one-off and a future annual renewal used confusingly similar descriptions; the one-off was renamed and the future renewal is now included once as a dated obligation.

**Work completed with Codex**

- Replaced the competing page calculations with one dated CFO read model containing month-end balance, lowest balance, projected overdraft, safety cushion, both restoration amounts, safe-to-spend, debt minimums, optional debt payment, and the forecast after actions.
- Classified recorded debt payments as protected, recognised the required minimums as already paid in the current demonstration month, and prevented protected categories from entering the action plan.
- Limited recovery actions to future changeable choices; past higher spending remains context rather than recoverable cash.
- Rebuilt Overview as one CFO story, added consistent position summaries to every route, expanded the Debts guidance, renamed Monthly Review to Your Action Plan, and corrected the purchase-scenario input and status rules.
- Removed implementation provenance and development language from the financial experience, added one demonstration-data notice, and replaced fictional account labels with ordinary account names.
- Documented the current seeded-demo boundary and the unimplemented local CSV-import and later Open Banking roadmap.

**Verification performed**

- `npm run demo:reset` passed and seeded 127 rows across 12 schema areas.
- `npm run format:check`, `npm run lint`, and `npm run typecheck` passed.
- `npm test` passed 4 files and 21 tests, including the new forecast, debt-protection, scenario, route-consistency, provenance, annual-renewal, and account-name regressions.
- `npm run build` passed and produced all five application routes.
- No GPT integration, deployment, debt snowball/avalanche engine, user-facing CSV import, upload, manual entry, visitor-data storage, or Open Banking capability was added.

**Collaboration and Git**

- The builder supplied the manual product-owner review and required this correction pass in the primary thread.
- Codex changed and verified workspace files only. No files were staged and no commit, push, amend, squash, or rebase was performed.

**Manual verification remaining**

- Review responsive layout, scenario input behaviour, and wording in a normal WSL browser session; the Codex workspace sandbox still cannot bind the application server port.

### 2026-07-18 — Phase 1 cash journey and debt-path correction

**Objective**

- Preserve the corrected canonical forecast while making the journey from now to next income, month end, healthy cash flow, and debt-free explicit and evidence-backed.

**Work completed with Codex**

- Extended the canonical forecast with next-income type/date/amount, balance immediately before and after income, negative-balance clearance and percentage, lowest-balance date, days below zero, future-income reliance, reconciled income allocation, and a documented financial-health classification.
- Added explicit fictional income classification and debt snapshots. The seed records payments, interest and new borrowing as separate facts rather than inferring them from a balance change.
- Added a deterministic minimum-payment debt projection, promotional-expiry/post-promotion rate handling, highest-effective-APR extra-payment allocation, and a separately labelled £200-per-month alternative scenario.
- Added staged milestones, an aggregate spending-pressure summary, and repeated routine-spending pattern detection that requires comparable history and excludes one-offs.
- Restructured Overview around the pre-income risk, income allocation and dated journey; expanded Debts with trajectory evidence; reorganised Your Action Plan into before income, on income, rest of month, next month and route-out-of-debt sections.
- Implemented a narrow optional CFO Brief with deterministic wording, fact IDs, strict structured output, `gpt-5.6-sol`, `store: false`, and fallbacks for no key, API failure, malformed output, or unknown fact references. No live API call or credential was used.
- Generated the second follow-on Drizzle migration and kept the resettable local demo independent of external services.

**Verified demonstration figures**

- Financial health: `overdraft_cycle` under the documented ordered rule.
- Lowest projected balance: -£1,348.00 on 22 July 2026; seven projected days below zero.
- Next confirmed salary: £3,150.00 on 25 July 2026; balance moves from -£1,348.00 to £1,802.00, with £1,348.00 (42.79%, displayed as 43%) clearing the negative balance.
- Projected month end: £1,582.00; safety cushion: £250.00; safe optional spending and optional debt overpayment: £0.00 while the dated path remains negative.
- Spending above recent usual: £412.42 already recorded; £20.00 remains reducible and can repair £20.00 of the cash gap.
- Debt: £12,700.00 current versus £12,450.00 previous, a £250.00 increase despite £413.00 of recorded payments. The snapshots record £226.00 interest and £437.00 new borrowing.
- Minimum-payment projection: payoff by February 2031 with £3,982.04 projected interest. The specified £200 monthly-extra scenario reaches October 2028 with £1,693.35 projected interest, subject to the documented assumptions.

**Verification performed**

- `npm run demo:reset` passed and seeded 133 rows across 13 schema areas.
- `npm run lint`, `npm run typecheck`, `npm test`, and `npm run format:check` passed. The final test run completed 6 files and 33 tests.
- `npm run build` passed and compiled the five application routes plus the CFO Brief API route.
- Server-render route tests verified the seeded demo output. A production-server launch was attempted on loopback and was blocked by the workspace sandbox with `listen EPERM`; browser interaction and responsive layout remain manual checks.
- The workspace secret-pattern scan returned no findings. Git inspection found no staged files and confirmed generated SQLite databases, `node_modules`, and `.next` are ignored. No generated database, dependency directory, build output, secret, private financial file, or generated report is tracked; `.env.example` and the empty reports-directory placeholder remain intentional public-safe repository files.

**Collaboration and Git**

- Codex implemented and verified the workspace changes in the primary thread. No Git stage, commit, push, amend, squash, or rebase operation was performed.
- The existing five commits were left unchanged. The builder must manually review, stage and commit this continuation from the normal WSL terminal if accepted.

**Manual verification remaining**

- Review responsive layout, route navigation, the scenario-to-brief interaction, and optional live GPT wording from a normal WSL browser session.
- Live GPT output was not exercised because no API key was used; structured-output and invalid-reference validation were tested directly, and the no-key deterministic path was tested through the route.

### 2026-07-18 — Phase 1 grounded CFO narratives

**Objective**

- Preserve every approved deterministic result while adding realistic fictional comparison history, one canonical model fact boundary, and distinct CFO Brief and Action Plan coaching experiences in the builder's two-evening priority order.

**Work completed with Codex**

- Added three complete fictional comparison months plus the current partial month for a two-adult, three-child demonstration household. The history includes routine variation, subscriptions, transfers/savings, and different unavoidable surprises without adding those coaching-only rows to the approved forecast calibration.
- Added a versioned, hashed canonical fact package containing the financial position, income journey, forecast, category comparisons, unexpected-cost history, subscriptions, transfers/savings, actions, milestones, debt plan, evidence summaries, data-quality warnings, and per-view fact allowlists.
- Added strict Zod narrative contracts for a concise CFO Brief and warmer Action Plan coaching. Output is limited to two actions and validated against allowed fact IDs and deterministic action IDs.
- Replaced the earlier narrow interpretation boundary with the official OpenAI JavaScript SDK, `gpt-5.6-sol`, the Responses API, `store: false`, server-only prompt/data handling, and a 20-second bounded request with one retry.
- Added a versioned SQLite narrative cache keyed by fact-package hash, narrative type, scenario, model, prompt version, and schema version. Added deterministic fallback behaviour for missing credentials, model/API failure, malformed output, or invalid references.
- Integrated the Brief into Overview and the coaching response at the top of Your Action Plan while leaving deterministic cards and calculations server-rendered and immediately available.
- Added `npm run demo:generate-briefs` to generate and cache both optional model responses after a demo reset. With the API key explicitly absent, the command stopped before making a request and explained that the fallback remained available.
- Added focused seed, fact-package, validation, cache-key, cache-round-trip, no-key route, and rendered-page tests. Installed the official `openai` SDK and the `server-only` marker package.
- Intentionally deferred lower-priority banned-phrase linting, merchant-level comparisons, fact-segment rendering, and a broad mocked-provider failure matrix under the builder's explicit two-evening priority rule.

**Verification performed**

- `npm run demo:reset` passed and seeded 282 rows across 14 schema areas.
- `npm run lint`, `npm run typecheck`, `npm test`, and `npm run format:check` passed. The full test run completed 7 files and 38 tests.
- `npm run build` passed and compiled all five application routes plus the CFO Brief API route.
- The pre-generation no-key check exited as designed without a model request. No API key, live model call, model-written response, screenshot, or `/feedback` identifier was used or claimed.
- The final secret-pattern and host-path scans returned zero matching files. Git had zero staged files; generated SQLite files, dependency/build directories, non-placeholder reports, and environment files other than `.env.example` were not tracked and remained ignored.
- The dependency installation audit reported four moderate advisories and no high or critical advisory in its summary; no automatic dependency remediation was run.

**Collaboration and Git**

- The builder supplied the product direction, fictional household shape, tone, strict correctness rule, and priority tiers. Codex implemented and verified the workspace changes in the primary thread.
- Git was inspected read-only. Codex did not stage, commit, push, amend, squash, or rebase, and the existing five commits were not changed. The builder must manually review and commit accepted changes from the normal WSL terminal.

**Manual verification remaining**

- Review both narratives, responsive layout, refresh/status wording, and the purchase-scenario-to-Brief interaction in a normal WSL browser.
- Exercise one live GPT-5.6 generation and the pre-generation cache workflow with a local API key, then review the returned wording. The deterministic fallback is the only model path exercised in this session.

### 2026-07-18 — Live GPT-5.6 path verification

**Objective**

- Verify only the real GPT-5.6 narrative, validation, cache, and production-page data path using the fictional seeded demo. Do not change deterministic financial calculations, fallback copy, page structure, or Git history.

**Environment and model verification**

- The builder created `/home/brightbluejay/code/personal-cfo/.env.local` and set mode `600`. Codex checked only its existence, mode, and Git-ignore status; the credential was not printed, echoed, read into chat, diffed, or committed.
- The official OpenAI SDK model list confirmed the exact account-visible model ID `gpt-5.6-sol` without sending financial data. A separate non-financial Responses request confirmed strict structured-output support and used 57 input and 14 output tokens.
- The standalone pre-generation command initially did not load `.env.local`. It was corrected to use Node's `--env-file-if-exists=.env.local`; Next.js and the command now use the same ignored file.

**Controlled live generation**

- Fact package: `d7a12d7104ba8a4385fbfe6eab48c7dffc2c3c092f0aa6faaf7ce852f1607f10`; prompt: `kitchen-table-v1`; validation/schema: `cfo-narrative-v2`; model: `gpt-5.6-sol`.
- The live CFO Brief was accepted and cached at `2026-07-18T11:56:07.697Z`. Its accepted request used 8,242 input and 880 output tokens, one API call, no retry, and no rejected response.
- The original 20-second bound was too short for the larger Action Plan request. The command's Action Plan phase and one isolated retry failed at the API-request boundary; neither produced or cached an accepted response. The bound was increased to 60 seconds with at most one retry, and sanitized attempt metadata was added. The accepted Action Plan was then cached at `2026-07-18T12:02:09.683Z` after one API call, no retry, and no rejected response; it used 8,744 input and 1,284 output tokens.
- Both accepted responses passed strict shape, maximum-action, fact-ID, action-ID, banned-language, markup, quantified-claim, and deterministic-scenario validation before cache writes. No prompt correction was required.
- At the published uncached text-token rates, the two accepted narrative requests cost approximately US$0.15 in total; the capability probe was below US$0.001. Usage was not available for the earlier timed-out request attempts, so their possible billing is not estimated.

**Production and cache verification**

- The production server returned `Cached GPT-5.6 brief` for Overview and `Cached GPT-5.6 coaching` for Action Plan. Neither response contained fallback status language.
- The two narrative hashes were different, confirming that the pages use distinct narrative types. Repeated requests returned unchanged narrative hashes and generation timestamps.
- After stopping and restarting the production server, both cache entries retained the same hashes, timestamps, and cached status labels. Refresh/restart requests made no new model calls because the validated cache entries were returned before generation.
- Cache reads revalidated the responses. Tracked-file secret patterns returned zero findings, and an exact in-memory comparison confirmed the configured API key appears in neither `.next` nor the generated SQLite cache. A broader heuristic produced false positives in ignored Next.js trace/development artifacts, but none matched the configured key. `.env.local` remained ignored and unstaged.
- Browser automation was unavailable in this workspace session. Production endpoint/component-path verification passed, but visual appearance in the builder's browser remains a manual check.

**Verification performed**

- `npm run format:check`, `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build` passed. The full test run completed 7 files and 38 tests.
- `npm run demo:reset` was intentionally not rerun after generation because reset removes the generated SQLite database and its narrative cache. The correct order is reset first, then pre-generate, then verify persistence.
- Git remained unstaged. Codex did not commit, push, amend, squash, or rebase.

### 2026-07-18 — Break-cycle Action Plan correction

**Objective and priority boundary**

- Preserve the approved deterministic financial engine while making Your Action Plan answer the monthly break-cycle question with exact targets, a supported recurring plan, and an honest answer about whether that plan is enough.
- Complete P0 first, then only the time-boxed P1 milestone and core-test work. P2 debt-effect re-dating, a broad test matrix, and an optional-overpayment-start milestone were deliberately not implemented.

**Work completed with Codex**

- Added a deterministic recurring recovery-plan selector. It treats existing savings as immediate timing support only, considers high-confidence subscriptions first, then supported trims to changeable categories, preserves category floors, leaves protected costs and required debt payments untouched, and selects no more than five changes.
- Added versioned recovery-plan facts for the exact zero-balance, safety-cushion and irregular-cost targets; all candidates and selected changes; gross savings; the irregular-cost allocation; net improvement; coverage; shortfall; user decisions; and milestones under the selected plan.
- Rebuilt Your Action Plan around: get through this month, the monthly target, a workable recurring plan, whether it closes the gap, coaching, milestones if the changes hold, debt effect, and the purchase scenario.
- Split the narrative contract so Overview remains capped at two immediate actions while Action Plan coaching may contain the five deterministically selected recurring changes.
- Formatted money and percentages in deterministic code before the model boundary. GPT receives display-ready values and remains unable to calculate or change financial results.
- Added focused recovery-plan tests for recurring/immediate separation, single-count irregular funding, selected-plan totals, protected floors, exact shortfalls, undated partial milestones, and the separate action limits.

**Demonstration result**

- Full sustainable monthly target: £1,803.00, comprising the £1,598.00 cushion-restoration requirement plus one £205.00 unfunded irregular-cost provision.
- Selected gross monthly savings: £634.04. After the irregular-cost allocation, net improvement is £429.04, target coverage is 23.8%, and the remaining monthly shortfall is £1,373.96.
- The plan is explicitly partial. All three plan milestones retain exact additional-improvement requirements and no supported dates. Safe optional debt payment remains £0.00 and no new overpayment date is claimed.

**Live narrative verification**

- A sandboxed generation attempt could not reach the API; the approved workspace-scoped network retry reached the service without exposing the credential.
- An early live response exposed raw integer minor units in prose and was rejected by local quantified-claim validation. Codex moved currency/percentage formatting into deterministic payload preparation and tightened the numeric-grounding prompt rather than weakening validation.
- Both final `gpt-5.6-sol` narratives were generated, validated and cached against fact package `59ef3a2a11c851e732f0375cce4f30faafec4a3ae9d70e39f6857327f1a6d6e1`, prompt `kitchen-table-v4`, and schema `cfo-narrative-v3`. The accepted narratives preserve the exact partial-plan figures and do not invent a recovery date.

**Verification performed**

- The final `npm run demo:reset` passed and seeded 282 rows across 14 tables. `npm run format:check`, `npm run lint`, the serial `npm run typecheck`, and `npm run build` passed; the production build compiled all application routes and the CFO Brief API route.
- The complete `npm test` run passed 8 files and 42 tests. The focused P0/P1 run passed 3 files and 20 tests.
- One parallel verification attempt ran TypeScript checking while the production build was replacing `.next/types`; that overlapping check failed on transient missing generated type files. The required serial type-check rerun after the build passed.
- After the final reset and build, both live narratives were regenerated and cached. The accepted CFO Brief used 9,114 input and 729 output tokens; the accepted Action Plan used 14,497 input and 1,187 output tokens. Each completed in one API call with no retry or rejected response.
- Git was inspected read-only and remained unstaged by Codex. Codex did not stage, commit, push, amend, squash, rebase, or recreate any existing commit.

**Manual verification remaining**

- Review the responsive Action Plan hierarchy and both cached narratives in a normal WSL browser.
- The builder must manually review and commit accepted changes from the normal WSL terminal because the workspace sandbox protects `.git`.

### 2026-07-18 — Flow-versus-stock financial correctness repair

**Objective and priority boundary**

- Audit every category derivation before editing, correct total-versus-monthly trims, replace the mixed monthly target with separate recurring-flow and one-off-backlog models, update the existing Action Plan and both narratives, then stop after time-boxed core milestone/tests.
- P2 broad test expansion, optional-overpayment timing, and revised debt-free-date work were explicitly skipped.

**Derivation finding**

- The arithmetic `average` helper correctly divided the complete-month aggregate by three. The overstatement occurred later: the proposed category reduction used projected current-month spending above the protected floor without also capping it at the supported flexible portion of one typical month.
- The correction introduces explicit baseline-month totals, combined total, arithmetic monthly mean, same-day comparison, current-to-date and projected spending, flexible share, protected floor, amount above floor, maximum supported monthly reduction, and selected monthly reduction.
- Corrected selected category reductions are £145.80 for groceries and £49.88 for eating out. Coffee (£14.16 maximum) and leisure (£14.83 maximum) remain unselected under the five-item priority rule.

**Two-part model**

- Normalised recurring income is £3,150.00. Existing recurring outgoings before the new provision are £3,302.20, producing a £152.20 recurring gap.
- The corrected five selected actions save £238.65 gross. Funding the £205.00 irregular-cost provision once leaves £33.65 net improvement and a £118.55 recurring shortfall. Recurring-flow coverage is 22.1%, and the cycle remains structurally short.
- The £1,348.00 amount to zero and £250.00 safety cushion are one-off stock targets, not monthly expenses. Immediate July actions reduce the £1,598.00 total to £1,308.00. Because the recurring plan remains short, monthly backlog-reduction capacity is £0.00.
- The permitted ceiling-division milestone method is implemented and tested. The seeded plan has no supported zero-balance, cushion-restoration, healthy-cycle, optional-overpayment, or revised debt-free date. Debt-effect re-dating remains deferred.

**Narrative boundary**

- Fact package `cfo-facts-v3` separates immediate plan, recurring income/outgoings/status, candidate and selected action derivations, the funded provision, action summary, one-off backlog, conditional milestones, and debt effect.
- Prompt `kitchen-table-v6` and schema `cfo-narrative-v4` require GPT to preserve the flow/stock distinction, the pre-plan-gap/provision order, corrected category means and floors, and the five-action/two-action view limits.
- Live responses that blurred the £152.20 pre-plan gap with the new £205.00 provision were rejected. Only responses that passed shape, reference, quantified-claim, action-ID, flow/backlog, and funded-provision validation were cached.

**Focused verification before the final pass**

- `npm run typecheck` passed.
- The focused P0/P1 run passed 3 files and 24 tests.
- The demo reset passed and seeded 282 fictional rows across 14 tables.
- Git remained read-only and unstaged by Codex; no commit history operation was performed.

**Final verification**

- The required final `npm run demo:reset` passed and reseeded 282 rows across 14 tables. `npm run format:check`, `npm run lint`, `npm run typecheck`, and `npm run build` passed.
- The full `npm test` run passed 8 files and 46 tests.
- Final live generation used exact model `gpt-5.6-sol`, fact package hash `385c5b1caade51379ad5da11add3fb5a98540ec41518450a855cc10fdf7d5cb8`, prompt `kitchen-table-v6`, fact version `cfo-facts-v3`, and schema `cfo-narrative-v4`.
- The final accepted CFO Brief used 10,857 input and 967 output tokens. The final accepted Action Plan used 18,137 input and 1,594 output tokens. Each final response completed in one API call with no retry or rejected response and was revalidated on cache read.
- P2 remained skipped. Browser appearance and product-owner wording review remain manual.

### 2026-07-18 — Savings-redirection and kitchen-table-v7 correction

**Objective**

- Reconcile the existing £200 of recurring savings contributions with the £205 surprise-cost requirement, make all selection outcomes visible, restore an explicit Stream House outcome, recompute milestones, and replace internal-accounting GPT prose with `kitchen-table-v7` without broadening product scope.

**Deterministic correction**

- Confirmed that the £200 is the sum of four confirmed future sinking-fund contributions rather than one £200 ledger transaction. Matched fictional savings transfers point to an owned account with the `savings` role. The candidate cites both allocation and matched-transfer evidence, remains user-confirmed, and is separate from the immediate £270 existing-balance decision.
- Added the stable `redirect-recurring-savings-during-overdraft-cycle` choice. Its invariant proves £200 redirected equals £200 assigned to the surprise-cost pot plus £0 remaining; only £5 is new monthly spending. The redirect changes purpose, does not change income, and is excluded from gross stopped/reduced spending.
- Added stable ranks, selected values, typed exclusion codes, plain-language explanations, evidence IDs, observation counts, and observation dates to every candidate. Stream House remains visible with one observation and `insufficient_recurrence`. Eating out, leisure, and coffee are feasible but carry `maximum_item_limit` because higher-priority choices fill the five-item plan.
- The selected choices are the redirect, three confirmed subscriptions, and groceries. Gross stopped/reduced spending is £188.77, redirected money is £200, newly set-aside money is £5, corrected outgoings are £3,118.43, and the normal month has a £31.57 surplus. The remaining one-time hole after July actions is £1,308, with £31.57 available each month to repair it.
- Replaced the prior undated result with a deterministic month-by-month schedule using the seeded date pattern and recorded promotional-rate expiry. Conditional milestones are May 2029 above zero, January 2030 cushion restored, February 2030 first complete healthy month and redirect review, and March 2030 optional-payment start. The conditional £31.57 optional payment moves the projected debt-free date from February 2031 to December 2030.

**Narrative contract**

- Incremented the fact package to `cfo-facts-v4`, prompt to `kitchen-table-v7`, and response schema to `cfo-narrative-v5`.
- Added a required single connecting observation, natural-date enforcement, whole-pound narrative display except exact named subscription prices, internal-taxonomy and fake-intimacy bans, temporary-redirect validation, and rejection of claims that call the £200 permanent, new income, or a saving. Existing structured-output, fact/action reference, number/date, action-limit, cache-hash, fallback, and API-error safeguards remain.

**Verification and live outcome**

- `npm run demo:reset` reseeded 282 fictional rows across 14 tables. `npm run format:check`, `npm run lint`, `npm run typecheck`, and `npm run build` passed. The full `npm test` run passed 8 files and 50 tests.
- The first sandboxed generation command could not reach the API and reported two transport attempts because the SDK used its configured retry. It produced no narrative and cached nothing.
- One reachable live generation was then attempted with exact model `gpt-5.6-sol`, fact hash `ac206c410000ffb69920458a02d26a88afb254543c87138daca03e21f6512b8c`, prompt `kitchen-table-v7`, fact version `cfo-facts-v4`, and schema `cfo-narrative-v5`. The command ended with a generic non-connection error before any accepted completion was logged. The sanitized command did not expose the rejected response or a specific validator reason. SQLite inspection confirmed zero narrative-cache rows. No further regeneration was attempted because the builder required exactly one final reachable generation.
- Live narrative text, accepted API-call counts, cache persistence, and refreshed-page live status remain genuinely blocked pending product-owner direction on whether a diagnostic/retry run is allowed. No Git staging or history operation was performed.
- Final diff checks found no whitespace errors, no staged changes, no tracked SQLite database, dependency directory, build output, generated report, or real environment file. The refined secret scan returned zero findings; its initial broad pattern matched only code that restores the `OPENAI_API_KEY` environment variable in a test, not a credential literal.

### 2026-07-18 — Cap-exempt redirect and value-aware selection

**Objective**

- Correct the final recovery-plan selection issue, recompute the financial route, then make no more than two controlled live GPT-5.6 attempts before stopping for engine review.

**Selection and recalculation**

- Made `redirect-recurring-savings-during-overdraft-cycle` confirmation-required but exempt from the five spending-change slots. Exposed one selected redirect, five selected spending changes, and six displayed plan lines separately in domain data, narrative facts, and the existing Action Plan section.
- Replaced subscription-first/category-second ordering with one eligible high-confidence value ranking across both kinds. Supported recurring monthly value is descending; stable action ID is the tie-breaker. Protection, confidence, duplication, and incompatibility exclusions remain prior gates and every unselected item retains a typed reason.
- The selected counted changes are groceries £145.80, eating out £49.88, DD PUREGYM £24.99, leisure £14.83, and coffee £14.16. Netflix £12.99 and Cloudy Digital £4.99 carry `maximum_item_limit`; Stream House £11.99 carries `insufficient_recurrence` after one observation.
- Gross stopped/reduced spending is £249.66. The existing £200 transfer funds £200 of the £205 surprise-cost pot, leaving £5 genuinely new. Corrected outgoings are £3,057.54 and the normal month has a £92.46 surplus. After the immediate July actions, £1,058 remains to return above zero and a further £250 restores the cushion; £92.46 per month is available for both balances.
- The forward schedule reaches above zero in July 2027, restores the cushion in October 2027, completes the first healthy month and reviews the redirect in November 2027, and permits a conditional £92.46 optional payment from December 2027. The delayed-payment projection moves debt-free from February 2031 to September 2029.
- Incremented the fact package to `cfo-facts-v5` and response schema to `cfo-narrative-v6`; `kitchen-table-v7` remains the prompt. The Action Plan structured contract permits one redirect plus five spending changes. Fallback wording was not changed.

**Tests and build**

- Added regressions for cap exemption, one-plus-five counts, value ordering across kinds, stable tie-breaking, documented lower-value precedence, confirmation requirements, typed exclusions, exact totals, and updated dates.
- `npm run demo:reset` reseeded 282 fictional rows across 14 tables. Formatting, lint, type-check, the 8-file/52-test suite, and the production build passed before live generation. After adding safe diagnostic metadata, lint, type-check, and the 7-test narrative file also passed.

**Controlled live outcome**

- Attempt 1 used `gpt-5.6-sol`, prompt `kitchen-table-v7`, fact version `cfo-facts-v5`, schema `cfo-narrative-v6`, fact hash `67f84b9ee248718b6ca009b9f83271ed32035202f13a1588d820c0771f67d999`, Brief cache key `660cc883fc893862d6820676574e95f844a2d86f46b91c6310a80ff880f645eb`, and Action Plan key `58ff79e335369a6b645b40e17d312ae4e082fd5ae93447122edf4f5b24573af8`. It ended with the pre-existing generic `Error` category before any narrative completed.
- As authorized, Codex added only sanitized operational diagnostics: category, elapsed time, failed type, completed types, safe SDK class, HTTP status, API-call count, retry flag, and API reachability. No facts, prompt wording, fallback wording, or validation rule was weakened.
- Attempt 2 reached the API once, used no SDK retry, and failed `structured_validation` on `cfo_brief` after 28,922 ms. No narrative completed. The two categories differed, but the maximum two attempts was reached and no third attempt was made.
- SQLite inspection after both attempts found zero narrative-cache rows. No failed, incomplete, unvalidated, or fallback response was stored. Refresh and restart persistence checks were inapplicable because no accepted cache existed.

### 2026-07-18 — Narrative-validator boundary repair

**Scope and diagnosis**

- Preserved all deterministic calculations, recovery selection, milestones, seed data, page structure, and fallback wording. The prior rejected `cfo_brief` payload was unrecoverable because `store: false` was used, no response was cached, and the fail-fast logger retained only the `structured_validation` category.
- Audited the pre-repair rules: exact and rounded currencies were generated through locale formatting, but negative facts also allowed an unqualified positive absolute value; exact pennies were restricted to subscription facts; date strings included yearless variants without ambiguity checks; percentages allowed exact and rounded values; prose bans used substring matching; and validation stopped at the first error.
- Confirmed all five recovery milestones plus the revised debt date exist in the canonical package and evidence index. Overview intentionally receives only `recovery.milestone.finish_above_zero`; Action Plan receives all recovery milestones and `recovery.debt_effect`.

**Focused repair**

- Added deterministic half-up whole-pound matching from integer minor units, exact-value matching, sign preservation, explicit `overdrawn`/`below zero`/`in the red` handling for negative facts, and exact-penny enforcement for named subscription actions.
- Added deterministic en-GB natural-date parsing. Yearless dates require one unique cited ISO date; wrong, unreferenced, ambiguous, relative, and visible ISO dates remain rejected.
- Replaced substring prose bans with boundary-aware word/phrase matches on visible GPT-written fields only. Added bounded, secret-sanitised multi-error diagnostics for schema paths, fact/action references, monetary/date claims, expected facts, banned hits, and exact rejection classifications.
- Incremented only the response schema to `cfo-narrative-v7`. Fact version remains `cfo-facts-v5`, prompt voice remains `kitchen-table-v7`, and the package hash remains `67f84b9ee248718b6ca009b9f83271ed32035202f13a1588d820c0771f67d999`.

**Verification and fresh live window**

- Formatting, lint, type-check, 61 tests across 8 files, and the production build passed. Synthetic checks accepted rounded whole-pound currency, a natural milestone date, and an exact subscription price; they rejected an invented amount, wrong date, and banned phrase with the expected classifications.
- Fresh attempt 1 made one API call per narrative with no SDK retry. `cfo_brief` passed all validation and was cached. `action_plan` was rejected because `£250` cited milestone facts rather than `recovery.backlog`, and visible caution text used banned word `recorded`. No Action Plan cache row was written.
- A single permitted prompt-grounding clarification required the specific amount-bearing fact and re-emphasised the existing banned list. Local lint, type-check, all 61 tests, and build passed again.
- Fresh attempt 2 made one API call with no retry and stopped on `cfo_brief`. It claimed “last 3 months” without an explicit cited count and again used banned word `recorded`. Both are model-output defects; no validator rule was weakened and no third request was made.
- The valid attempt-1 Brief remains cached at key `17c25666f0980ee3c6725b511bd02e354a01c3c9d06ab1273aae4597d9df4dab`, revalidates on read, and contains no secret pattern. Action Plan key `187c43666b587915f511dd20a82f5fd6977c4f3e44875c0024f7e7eb81d1325e` has no accepted row. Because a complete pair was not produced, page refresh and restart-persistence checks were not claimed.

### 2026-07-19 — Action Plan cache reuse correction

- Diagnosed the reported changing Action Plan without altering narrative content or the financial engine. The accepted Action Plan row existed, its write key exactly matched the current read key across fact hash, narrative type, scenario, model, `kitchen-table-v7`, and `cfo-narrative-v7`, and current validation accepted the stored response.
- The cause was the existing client refresh control sending `refresh: true`; the route deliberately treated that as permission to bypass a healthy cache. Changed only the route decision so any valid revalidated cache entry returns immediately. Removed the now-unreachable cached fallback branches.
- Added a route regression with a provider-fetch spy. Even when the request contains `refresh: true` and a key is configured, the response is `cached_gpt`, carries the cached coaching label and timestamp, and makes zero provider fetches.
- Two live localhost requests returned identical Action Plan hashes, timestamps and `Cached GPT-5.6 coaching` labels. After a graceful dev-server restart, the same cache key, timestamp and narrative hash returned again. The cache timestamp did not change.
- Four provider generations since 23:45 are directly evidenced: two narratives in the first controlled attempt, the Brief in the second controlled attempt, and the accepted Action Plan written at 23:57:58. The route did not previously persist an attempt ledger, so additional failed requests cannot be reconstructed from SQLite; no additional successful write is visible.
