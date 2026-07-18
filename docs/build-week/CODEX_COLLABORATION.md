# Codex Collaboration

This record contains only work observed in the primary Build Week thread.

## Where Codex accelerated development

- Verified the restarted WSL environment and empty repository metadata before initialization.
- Installed and verified the WSL-local Node LTS toolchain through `nvm`.
- Implemented the Next.js, Tailwind, Drizzle, SQLite, migration, seed, test, and dashboard foundation directly in the repository.
- Diagnosed WSL temp-path inheritance, sandbox worker-port restrictions, and package-version incompatibilities during validation.

## Decisions retained by the builder

- The builder defined the local-first architecture, public-submission privacy boundary, required schema, judging navigation, excluded features, and validation gates.
- The builder required use of the supplied fictional data and prohibited real providers, identities, financial details, credentials, and private circumstances.
- Codex recommended MIT and retained the Python prototype as a non-runtime reference; the builder should confirm the licence before publication.

## How GPT-5.6 is used in the product

- Evening 1 itself introduced no GPT call. The 2026-07-18 continuation added optional CFO Brief and Action Plan narrative types using `gpt-5.6-sol` through the official JavaScript SDK and Responses API.
- The request contains only an allowlisted view of a versioned fictional derived-fact package, uses strict Zod-backed structured output and `store: false`, and requires fact IDs for every section. Deterministic code remains responsible for every amount, date, classification, scenario and debt outcome.
- Valid model output is checked against fact and action allowlists, limited to two actions, and cached in local SQLite by fact, narrative, scenario, model, prompt, and schema versions. The no-key path is deterministic; API, parsing, schema, or reference failure also falls back without blocking the demo.
- No live API call or credential was used in the Codex session. The pre-generation command was exercised with the key explicitly absent and correctly stopped before making a request.

## Phase 1 continuation

- The builder approved the deterministic CFO-loop direction and additional transfer, savings, and funding-envelope correctness constraints before Phase 1 implementation.
- Codex implemented the workspace changes in the primary thread. Any Git review, staging, and commit of these later changes remains a manual builder action because the workspace sandbox protects `.git`.

## Manual product-owner correction review

- The builder manually reviewed Phase 1 and identified contradictory financial figures, an unsafe debt-reduction suggestion, unclear scenario behaviour, ambiguous annual-cost presentation, and implementation-focused language in the main experience.
- Codex traced those findings to competing read models, incorrect time horizons, double deduction of past transactions, missing debt-payment classification, and scenario evaluation before valid input.
- The correction pass establishes one dated CFO result across all routes, protects debt minimums, separates the already-paid one-off from the future annual renewal, and reshapes the interface around position, causes, actions, improvement, debt, and purchase decisions.
- Deployment, full debt-strategy comparison, user-facing CSV import, uploads, manual entry, and Open Banking remain unimplemented. A narrow optional GPT CFO Brief is now implemented; live-key behaviour remains a manual check.

## Phase 1 cash-journey correction

- The builder's follow-up review required a clearer route from the immediate position through next income, month end, healthy cash flow and debt-free.
- Codex extended the canonical dated forecast, added explicit income classification and debt snapshots, implemented income-allocation reconciliation, financial-health rules, spending-pressure aggregation, supported repeated-pattern detection, debt projections, milestones, and the bounded CFO Brief.
- Codex kept all implementation and verification workspace-scoped. Git remained untouched; the builder must manually review, stage and commit this continuation if accepted.

## Phase 1 narrative correction

- The builder required a more realistic fictional household history, a canonical fact boundary, a real but optional GPT-5.6 interpretation path, two distinct user-facing narratives, local caching, and a strict two-evening priority order.
- Codex added the coaching-only history, preserved the approved forecast, implemented the fact package, official SDK boundary, prompt/schema versions, validation, cache, pre-generation command, deterministic fallbacks, route integration, and focused tests in the primary thread.
- Lower-priority merchant-level comparisons, phrase linting, fact-segment rendering, and a broad mocked-provider failure matrix were intentionally deferred under the builder's priority rule. Git remained untouched.

## Live GPT-5.6 path verification

- After the builder created an ignored, user-readable-only `.env.local`, Codex verified `gpt-5.6-sol` through the official SDK model list and a non-financial Responses structured-output probe without displaying or inspecting the credential.
- The first controlled run produced and cached a valid CFO Brief. The larger Action Plan request exposed an overly short 20-second request bound; Codex changed only the server-side timeout/error instrumentation, retried that narrative in isolation, validated it, and cached it without regenerating the accepted Brief.
- Production endpoint checks confirmed distinct cached Brief and coaching responses, correct status labels, unchanged hashes/timestamps across repeated loads, and SQLite cache persistence across a full server restart. Browser appearance remains a manual builder check because browser automation was unavailable in the workspace session.

## Break-cycle Action Plan correction

- The builder required strict priority ordering: first an exact recurring target and supported plan, then only time-boxed milestone/core-test work, with debt-effect re-dating and the broad test matrix deferred.
- Codex preserved the approved deterministic forecast and added the recurring selector, recovery-plan facts, separate immediate and recurring UI sections, five-action coaching contract, partial-plan milestones, and focused invariants in the primary thread.
- A controlled live run exposed that raw integer minor units were visible to the model. Codex moved currency and percentage formatting into deterministic payload preparation, tightened the grounding prompt, regenerated both narratives with `gpt-5.6-sol`, and accepted only responses that passed the existing local validator.
- Git remained untouched. The builder must manually review, stage, and commit any accepted continuation from the normal WSL terminal.

## Flow-versus-stock correctness repair

- The builder challenged the category reductions and the mixed £1,803 target, required a complete read-only derivation audit before correction, and set strict P0/P1/P2 stopping rules.
- Codex confirmed that the mean helper divided the three-month aggregate correctly, then traced the overstated trims to a missing cap on the supported flexible portion of one typical month. It added explicit monthly category facts and corrected the selector without changing the fictional story broadly.
- Codex replaced the mixed target with a normalised recurring-flow model and a separate one-off backlog/cushion model, updated the existing Action Plan sections and narrative facts, and added only the requested core regressions plus the permitted ceiling-division milestone fallback.
- Live responses that blurred the pre-plan gap and newly funded provision were rejected rather than cached. The final prompt and semantic validator state the calculation order explicitly. Git remained untouched and P2 debt re-dating was skipped.

## Savings-redirection and kitchen-table-v7 correction

- The builder identified that the existing £200 future savings contribution had not been used intelligently, required typed outcomes for every unselected choice, and required GPT prose to stop exposing internal accounting vocabulary.
- Codex traced the £200 to four confirmed fictional sinking-fund contributions and matched savings-transfer evidence, implemented the temporary user-confirmed redirect with a one-pound-one-purpose invariant, made Stream House and every feasible flexible category explicit, and recomputed the five-item plan and dated debt effect.
- Codex replaced the narrative contract with `kitchen-table-v7`, added one cited human observation plus stricter language/number/date/redirect validation, and expanded focused tests while preserving the deterministic fallback and existing safety boundary.
- Local verification passed. The sandboxed network attempt failed before generation, and the one reachable final run ended before any response was accepted or cached. Codex stopped without a second reachable regeneration, recorded the zero-row cache result, and did not fabricate narratives, validator details, or persistence evidence.

## Cap-exempt redirect and value-aware selection

- The builder corrected the plan semantics: redirecting an existing outflow must not consume one of five genuine spending-change slots, and otherwise eligible choices must rank by supported value rather than merchant kind or fixture order.
- Codex implemented separate redirect/spending/display counts, cross-kind descending-value selection, stable action-ID tie-breaking, typed exclusions, revised facts/UI totals, and updated monthly, milestone, and delayed debt projections.
- The builder authorized two controlled live attempts. Attempt 1 ended with the existing generic error before any completion. Codex then added sanitized diagnostics only; attempt 2 reached the API once and failed structured validation on the Overview Brief. Codex stopped at the two-attempt ceiling with an empty cache and did not present fallback text as live GPT output.

## Narrative-validator boundary repair

- The builder isolated the remaining failure to local response validation and required strict documented equivalents rather than fuzzy financial matching.
- Codex audited the validator and milestone scopes, corrected sign handling, deterministic whole-pound currency, natural-date resolution, boundary-aware prose bans, and bounded multi-error diagnostics without changing the financial engine or fallback wording.
- Two fresh controlled attempts exposed model-output defects precisely. One valid Overview Brief remains safely cached; no Action Plan response passed. Codex stopped at the two-attempt ceiling and did not weaken validation or present fallback content as live GPT output.

## Primary Codex session

Codex completed the Evening 1 implementation and workspace-scoped verification in the primary thread. Because the Codex sandbox protected `.git`, the builder manually reviewed the resulting working tree, staged the files, and created the five incremental commits from a normal WSL terminal. The commits are builder-created evidence of the Codex-assisted implementation; Codex did not claim to stage or create them.

The required `/feedback` session identifier must be collected manually from the primary build thread. Do not invent or commit a placeholder that resembles a real identifier.
