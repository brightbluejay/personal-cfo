---
name: personal-cfo
description: Build and maintain a local-first personal finance assistant that calculates cash flow and consumer-debt payoff plans, categorises transactions, and produces concise grounded explanations. Use for ledger, affordability, debt snowball/avalanche, monthly review, demo-data, and Build Week submission tasks. Do not use for investment, tax, pension, mortgage, payment-initiation, or regulated-advice features.
---

# Personal CFO Skill

## Product principle

Code calculates. GPT interprets. The user decides.

## Required behaviour

- Keep monetary calculations deterministic and covered by tests.
- Treat GPT output as untrusted structured data and validate it.
- Do not let GPT invent or modify financial values.
- Store demonstration data locally and use fictional values in the public repository.
- Preserve a working demo path when external APIs are unavailable.

## Data flow

1. Import or seed accounts and transactions.
2. Normalise merchant descriptions locally.
3. Apply deterministic category rules.
4. Send only low-confidence items to GPT-5.6 using structured output.
5. Store category provenance and confidence.
6. Calculate monthly cash flow, protected buffer, and safe-to-spend in code.
7. Simulate debt strategies in code.
8. Send a compact validated monthly summary to GPT-5.6.
9. Accept no more than two grounded actions from the model.

## Privacy

- Never place private source data in public fixtures, prompts, logs, documentation, screenshots, or commits.
- Do not send authentication tokens or raw bank credentials to GPT.
- Document exactly what derived data is sent to the model.

## Build Week records

Use the templates in `docs/build-week/`. Record only verified work and preserve the primary Codex thread for the majority of core implementation.
