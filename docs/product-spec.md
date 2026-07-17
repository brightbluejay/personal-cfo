# Personal CFO — MVP Product Specification

## Problem

A current-account balance does not tell a person what is genuinely safe to spend. Debt calculators often ignore the month-to-month cash-flow pressures that cause new borrowing.

## Promise

**Know what is safe. Clear what you owe.**

## Judge journey

A judge can:

1. launch demo mode;
2. inspect fictional accounts and transactions;
3. see categorised monthly spending;
4. view income, essentials, debt minimums, and upcoming commitments;
5. calculate safe-to-spend until payday;
6. test a proposed purchase;
7. compare snowball and avalanche plans;
8. see payoff duration and interest differences;
9. generate a GPT-5.6 monthly review with no more than two actions.

## Functional requirements

### Local ledger

Use SQLite as the source of truth for accounts, transactions, categories, rules, debts, income, commitments, upcoming expenses, monthly plans, AI reviews, and sync records.

### Categorisation

1. normalise descriptions;
2. apply deterministic rules;
3. accept user corrections and save local rules;
4. use GPT-5.6 only for low-confidence items;
5. persist provenance and confidence.

### Safe-to-spend

Calculate in code:

`available cash + expected income - essentials - debt minimums - committed costs - protected buffer`

Return affordable, risky, or unaffordable for a proposed purchase and identify the trade-off.

### Debt engine

Compare:

- minimum-payment baseline;
- debt snowball;
- debt avalanche;
- extra-payment scenarios.

Show payoff month, total interest, total paid, strategy difference, next target, and promotional-rate warnings.

### GPT-5.6 review

Provide the model only with validated derived facts. Require structured output containing:

- concise summary;
- zero to two actions;
- optional warning;
- references to supporting calculated facts.

Reject unsupported figures.

### Open Banking

TrueLayer sandbox is a stretch integration. Seeded demo mode must remain independent and reliable.

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
