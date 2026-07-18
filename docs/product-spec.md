# Personal CFO — MVP Product Specification

## Problem

A current-account balance does not tell a person what is genuinely safe to spend. Debt calculators often ignore the month-to-month cash-flow pressures that cause new borrowing.

## Promise

**Know what is safe. Clear what you owe.**

## Current Phase 1 journey

A judge can:

1. launch demo mode;
2. inspect fictional accounts and transactions;
3. see categorised monthly spending;
4. view income, essentials, debt minimums, and upcoming commitments;
5. follow the cash position from now, through the pre-income low, next confirmed income, and month end;
6. see how much of the next income clears the negative balance and how the remainder is allocated;
7. distinguish spending already above usual from spending that can still be changed;
8. test a proposed purchase;
9. see debt change since the previous snapshot, a minimum-payment payoff path, a specified overpayment scenario, and promotional-rate warnings;
10. see the exact recurring monthly improvement needed to finish above zero, restore the safety cushion, and fund irregular costs;
11. compare that target with up to five supported recurring changes and see the remaining shortfall honestly;
12. follow milestones from the immediate cash gap to healthy cash flow and debt-free;
13. read a grounded CFO Brief on Overview and kitchen-table coaching on Your Action Plan; both work deterministically without an API key and can optionally use GPT-5.6 wording.

Full snowball/avalanche comparison remains later work.

## Functional requirements

### Phase 1 — deterministic CFO loop

The Phase 1 experience follows: **observe → diagnose → explain → recommend → simulate**.

- TypeScript code computes all monetary values. The optional GPT layer may interpret only validated derived facts and must return a bounded structured response; it must never calculate balances, affordability, payoff dates, classifications, or recovery amounts.
- The local demo includes three complete comparable fictional months plus the current partial month, routine-spending anomalies, different unavoidable surprises, recurring subscriptions, transfers/savings, a forecast shortfall/pressure case, and a fictional funding-envelope example. The household persona is fictional and contains two adults and three children.
- The UI must lead with cash-flow risk, surface a concise CFO summary, ranked evidence-linked drivers, a deterministic recovery plan that never cuts protected categories, and a purchase scenario that labels the outcome safe, risky, or unsafe.

### Canonical cash journey and financial health

The shared forecast must expose:

- current accessible cash and planning date;
- next confirmed income amount, date, recorded income type, and balance immediately before and after it;
- the amount and percentage of that income used to clear a negative balance;
- lowest balance and date, projected month-end balance, safety cushion, days below zero, and whether the cycle relies on later income;
- an allocation of the next income across negative-balance clearance, later commitments, protected debt payments, remaining usual spending, safety cushion, and genuinely unallocated cash. These buckets must reconcile without double counting.

Only income explicitly classified as `salary` may be described as salary or payday.

Financial health is deterministic and uses the first matching rule:

1. `worsening_debt_position`: month end remains below zero after confirmed income and obligations;
2. `overdraft_cycle`: a balance falls below zero before the next income and clearing it consumes at least the safety-cushion amount or 10% of that income;
3. `relying_on_next_income`: a balance falls below zero and a later confirmed income restores it above zero;
4. `tight_but_stable`: every balance stays non-negative but the low falls below the safety cushion;
5. `healthy`: every projected balance remains at or above the safety cushion.

When an overdraft is projected, the Overview headline must lead with the low point rather than a positive month-end balance.

### Account ownership, transfers, and funding envelopes

- Accounts record ownership (`owned`, `external`, or `unknown`), a role (`primary`, `spending`, `bills`, `savings`, `emergency_fund`, `debt`, `investment`, or `other`), and optional purpose.
- Transactions record a movement type: `income`, `expense`, `internal_transfer`, `savings_transfer`, `debt_payment`, `refund`, `adjustment`, or `unknown`.
- Transfer matching is deterministic and evidence-based: equal/opposite amounts, a documented three-day window, owned-account eligibility, normalised references/descriptions, account-name signals, repeated patterns, and confirmed or rejected relationships. Groups have stable identifiers, evidence references, a status (`matched`, `suggested`, `unmatched`, or `rejected`), and a confidence level.
- A high-confidence matched transfer is excluded from income, consumption, anomalies, and leakage while remaining in account timelines, liquidity, and transfer reporting. Medium confidence remains a suggestion; low confidence remains unmatched. Rejected and ambiguous movements are never silently reconciled.
- A one-sided probable savings movement remains visible with uncertainty. Designated savings reduces accessible cash, but is not consumption.
- A funding allocation to a spending account is not spending. An envelope reports allocation, actual eligible expenditure, exhaustion date, qualifying fallback spending after exhaustion, effective spending, and over/underspend without double counting. The model supports multiple one-sided automated savings movements and does not assume they will always resolve one-to-one.

### Local ledger

Use SQLite as the source of truth for accounts, transactions, categories, rules, debts, income, commitments, upcoming expenses, monthly plans, AI reviews, and sync records.

### Categorisation

1. normalise descriptions;
2. apply deterministic rules;
3. accept user corrections and save local rules;
4. use GPT-5.6 only for low-confidence items;
5. persist provenance and confidence.

### Safe-to-spend

Start from accessible cash on the planning date and apply only future confirmed events through month end. Do not deduct past spending or paid debt minimums again. Calculate a dated running balance and return one canonical result containing projected month-end balance, lowest projected balance, projected overdraft, safety cushion, amounts needed to avoid overdraft and restore the cushion, safe-to-spend now, required debt minimums, safe additional debt payment, and forecast after the action plan.

Safe-to-spend must be zero if a purchase would worsen a projected overdraft or breach the safety cushion. A purchase scenario is not evaluated until both a positive amount and a valid date are provided.

Debt minimums are protected, included once, visible as pressure where relevant, and never offered as discretionary reductions.

### Debt engine

The current Phase 1 trajectory shows:

- current balance and change from the previous explicit snapshot;
- recorded payments, interest, and new borrowing without inferring missing activity;
- a minimum-payment payoff date and total interest;
- a separately labelled £200-per-month extra-payment scenario that begins only once cash flow is stable;
- the current priority debt and promotional expiry/post-promotion rate warning.

Projection assumptions are recorded: integer minor units, interest rounded to the nearest penny once monthly, minimums paid monthly, extra money directed to the highest effective APR, and no later borrowing, fees, or missed payments. Missing snapshot or rate data must be stated rather than invented.

Later strategy comparison will add:

- minimum-payment baseline;
- debt snowball;
- debt avalanche;
- extra-payment scenarios.

Show payoff month, total interest, total paid, strategy difference, next target, and promotional-rate warnings.

### GPT-5.6 review

Provide GPT-5.6 Sol through the official JavaScript SDK and Responses API only with validated derived facts. Disable response storage in the request and require strict structured output containing:

- what happened and why;
- unavoidable and controllable parts;
- one immediate action;
- the next milestone;
- optional deterministic scenario impact;
- references to supporting calculated fact IDs for every claim.

The canonical fact package is versioned and hashed. It contains financial position, income journey, dated forecast, explicit same-day and full-month category comparisons, unexpected-cost history, subscriptions, transfer/savings summaries, deterministic actions, recurring-month facts, the one-time amount to repair, every ranked selected and unselected recovery choice, milestones, debt plan, data-quality warnings, and per-view allowlists. Overview output is capped at two actions; Action Plan coaching is capped at one temporary redirect plus five spending changes selected by deterministic code. Both must cite only allowed fact IDs and deterministic action IDs and include exactly one cited connecting observation. Currency claims may reproduce the exact cited value or its deterministic half-up whole-pound rendering; signs remain authoritative, with explicit “overdrawn” wording permitted to express a cited negative value, and named subscription actions retaining exact pennies. Natural dates resolve only against cited ISO facts, and an omitted year is accepted only when that resolution is unambiguous.

Reject unsupported facts and unknown references. A missing key, network/API failure, malformed output, or validation failure must return the relevant deterministic Brief or coaching response without blocking the demo. Valid model output is cached locally by fact-package hash, narrative type, scenario, model, prompt version, and response-schema version. The product has no chatbot and GPT does not receive raw transactions in this integration.

### Spending and milestones

The spending view must aggregate the amount above recent usual, the portion that has already happened, the smaller amount still reducible, and the amount that can repair the current cash gap. Repeated-pattern language requires at least four comparable routine month-to-date samples and two consecutive increases; one-off spending is excluded and never annualised.

The Action Plan separates the normal month from the one-time amount needed to return above zero and rebuild the safety cushion. The monthly section exposes income, protected commitments, debt minimums, essential and flexible spending, subscriptions, existing savings contributions, the surprise-cost pot, money stopped or reduced, money redirected, money newly set aside, and the resulting surplus or shortfall. Neither the temporary pre-income low nor the cushion is treated as a monthly expense.

Every category trim exposes three individual baseline-month totals, their arithmetic monthly mean, same-day comparable spending, current and projected spending, flexible percentage, protected floor, maximum supported monthly reduction, selected reduction, selection rank, cap treatment, and any typed exclusion reason. The selected reduction is capped at the flexible portion of one typical month and the amount above the protected floor. Same-day comparisons are diagnostic only and multi-month aggregates are never used as recurring monthly reductions. A separate user-confirmed choice may temporarily redirect future savings contributions to the surprise-cost pot when the destination is an owned savings account; it must expose source purposes, destination role, exact reconciliation, access questions and a healthy-cycle review condition. It never changes income, never counts the existing savings balance, never counts the same £200 as both a saving and a redirected amount, and is exempt from the five spending-change slots. Otherwise eligible high-confidence subscriptions and flexible trims are ranked together by supported monthly value, highest first, with a stable action-ID tie-breaker. Required debt payments and protected categories are never candidates.

Milestones under a selected plan include the remaining one-time hole, the amount available each month, assumptions, and any remaining shortfall. When that monthly amount is positive, a deterministic month-by-month schedule derives the first above-zero month, cushion-restoration month, first complete healthy month, savings-redirect review, optional-overpayment start, and a delayed-extra-payment debt projection. The schedule assumes the seeded income and commitment timing repeats, required minimums continue, recorded promotional-rate expiries apply, and no new borrowing or unplanned expenses occur. When the monthly amount is zero or negative, no unsupported date is produced.

### Open Banking

TrueLayer sandbox is a stretch integration. Seeded demo mode must remain independent and reliable.

### Data ingestion boundary

The current public demo is populated only by preloaded fictional repository fixtures. It does not provide user-facing CSV import, uploads, manual transaction entry, visitor-data storage, or a bank connection.

The deterministic CFO domain consumes a normalised ledger and is independent of ingestion method. The intended sequence is:

1. Current: resettable seeded fictional ledger.
2. First post-hackathon private-use capability: local CSV statement import with account selection, column mapping, date/amount normalisation, duplicate detection, transfer reconciliation, uncertain-classification review, and ignored local SQLite storage. Not implemented.
3. Later: consent-based Open Banking synchronisation through a suitable provider. Not implemented.

All future ingestion paths must create the same account, transaction, movement, and reconciliation records consumed by the CFO domain.

## Out of scope

- production Open Banking onboarding;
- payment initiation;
- user accounts and cloud sync;
- investments, pensions, tax, or credit scoring;
- receipt OCR;
- native mobile apps;
- cloud infrastructure.

## Safety and disclosure

The app provides educational planning information, not regulated financial advice. Projections depend on stated assumptions and are not guarantees.
