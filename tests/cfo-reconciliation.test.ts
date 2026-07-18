import { describe, expect, it } from "vitest";
import { calculateFundingEnvelopes } from "../src/domain/cfo/envelopes";
import { reconcileTransfers } from "../src/domain/cfo/transfer-reconciliation";
import type { CfoAccount, CfoTransaction } from "../src/domain/cfo/types";

const accounts: CfoAccount[] = [
  {
    id: "primary",
    name: "Primary",
    ownership: "owned",
    role: "primary",
    purpose: null,
    balanceMinor: 10_000,
    envelopeCategorySlugs: [],
  },
  {
    id: "spending",
    name: "Spending",
    ownership: "owned",
    role: "spending",
    purpose: "essentials",
    balanceMinor: 0,
    envelopeCategorySlugs: ["groceries"],
  },
  {
    id: "savings",
    name: "Savings",
    ownership: "owned",
    role: "savings",
    purpose: "reserve",
    balanceMinor: 2_000,
    envelopeCategorySlugs: [],
  },
];

function transaction(
  overrides: Partial<CfoTransaction> &
    Pick<CfoTransaction, "id" | "accountId" | "amountMinor">,
): CfoTransaction {
  return {
    categoryId: null,
    categorySlug: null,
    bookedDate: "2026-07-10",
    description: "movement",
    normalizedDescription: "movement",
    movementType: "unknown",
    spendingContext: "routine",
    counterpartyAccountId: null,
    externalReference: null,
    ...overrides,
  };
}

describe("deterministic transfer reconciliation", () => {
  it("excludes a matched owned-account movement from consumption and preserves both evidence references", () => {
    const transactions = [
      transaction({
        id: "out",
        accountId: "primary",
        amountMinor: -5_000,
        movementType: "internal_transfer",
        counterpartyAccountId: "spending",
        externalReference: "x",
      }),
      transaction({
        id: "in",
        accountId: "spending",
        amountMinor: 5_000,
        movementType: "internal_transfer",
        counterpartyAccountId: "primary",
        externalReference: "x",
      }),
    ];
    const result = reconcileTransfers(accounts, transactions);
    expect(result.groups).toHaveLength(1);
    expect(result.groups[0]).toMatchObject({
      status: "matched",
      confidence: "high",
      movementType: "internal_transfer",
    });
    expect(result.groups[0].evidence.map((item) => item.id)).toEqual([
      "transaction:out",
      "transaction:in",
    ]);
    expect(result.effectiveMovementTypes.out).toBe("internal_transfer");
    expect(result.effectiveMovementTypes.in).toBe("internal_transfer");
  });

  it("keeps one-sided savings visible as unresolved while excluding it from consumption", () => {
    const result = reconcileTransfers(accounts, [
      transaction({
        id: "reserve",
        accountId: "primary",
        amountMinor: -1_000,
        movementType: "savings_transfer",
        counterpartyAccountId: "savings",
      }),
    ]);
    expect(result.groups[0]).toMatchObject({
      status: "suggested",
      movementType: "savings_transfer",
    });
    expect(result.unresolvedTransactionIds).toContain("reserve");
    expect(result.effectiveMovementTypes.reserve).toBe("savings_transfer");
  });

  it("can resolve several explicitly linked savings drips into one receiving entry", () => {
    const result = reconcileTransfers(accounts, [
      transaction({
        id: "drip-a",
        accountId: "primary",
        amountMinor: -400,
        movementType: "savings_transfer",
        counterpartyAccountId: "savings",
        externalReference: "sweep",
      }),
      transaction({
        id: "drip-b",
        accountId: "primary",
        amountMinor: -600,
        movementType: "savings_transfer",
        counterpartyAccountId: "savings",
        externalReference: "sweep",
      }),
      transaction({
        id: "received",
        accountId: "savings",
        amountMinor: 1_000,
        movementType: "savings_transfer",
        counterpartyAccountId: "primary",
        externalReference: "sweep",
      }),
    ]);
    expect(
      result.groups.some(
        (group) =>
          group.status === "matched" && group.transactionIds.length === 3,
      ),
    ).toBe(true);
  });

  it("does not silently reconcile rejected or ambiguous movements", () => {
    const ambiguous = [
      transaction({
        id: "out",
        accountId: "primary",
        amountMinor: -5_000,
        movementType: "internal_transfer",
        counterpartyAccountId: "spending",
      }),
      transaction({
        id: "in-a",
        accountId: "spending",
        amountMinor: 5_000,
        movementType: "internal_transfer",
      }),
      transaction({
        id: "in-b",
        accountId: "spending",
        amountMinor: 5_000,
        movementType: "internal_transfer",
      }),
    ];
    const result = reconcileTransfers(accounts, ambiguous, [
      { fromAccountId: "primary", toAccountId: "spending", status: "rejected" },
    ]);
    expect(result.groups.every((group) => group.status !== "matched")).toBe(
      true,
    );
    expect(result.unresolvedTransactionIds).toContain("out");
  });

  it("calculates an envelope from actual eligible spend and fallback, never from its allocation", () => {
    const transactions = [
      transaction({
        id: "allocation-out",
        accountId: "primary",
        amountMinor: -5_000,
        movementType: "internal_transfer",
        counterpartyAccountId: "spending",
        externalReference: "fund",
      }),
      transaction({
        id: "allocation-in",
        accountId: "spending",
        amountMinor: 5_000,
        movementType: "internal_transfer",
        counterpartyAccountId: "primary",
        externalReference: "fund",
      }),
      transaction({
        id: "spend",
        accountId: "spending",
        amountMinor: -5_000,
        categorySlug: "groceries",
        movementType: "expense",
      }),
      transaction({
        id: "fallback",
        accountId: "primary",
        amountMinor: -1_200,
        categorySlug: "groceries",
        movementType: "expense",
        bookedDate: "2026-07-11",
      }),
    ];
    const result = reconcileTransfers(accounts, transactions);
    const [envelope] = calculateFundingEnvelopes(
      accounts,
      transactions,
      result,
      "2026-07-01",
      "2026-07-31",
    );
    expect(envelope).toMatchObject({
      allocatedMinor: 5_000,
      eligibleSpendingMinor: 5_000,
      fallbackSpendingMinor: 1_200,
      effectiveSpendingMinor: 6_200,
      exceededMinor: 1_200,
    });
  });
});
