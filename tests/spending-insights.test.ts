import { describe, expect, it } from "vitest";
import {
  detectRepeatedSpendingPatterns,
  summariseSpendingPressure,
} from "../src/domain/cfo/spending-insights";
import type {
  CfoTransaction,
  ReconciliationResult,
} from "../src/domain/cfo/types";

const reconciliation: ReconciliationResult = {
  groups: [],
  effectiveMovementTypes: {},
  unresolvedTransactionIds: [],
};

function transaction(
  id: string,
  date: string,
  amountMinor: number,
  spendingContext: CfoTransaction["spendingContext"] = "routine",
): CfoTransaction {
  return {
    id,
    accountId: "account",
    categoryId: "category",
    categorySlug: "groceries",
    bookedDate: date,
    description: "Demo purchase",
    normalizedDescription: "demo purchase",
    amountMinor: -amountMinor,
    movementType: "expense",
    spendingContext,
    counterpartyAccountId: null,
    externalReference: null,
  };
}

describe("spending insights", () => {
  it("separates spending that already happened from the smaller reducible remainder", () => {
    const summary = summariseSpendingPressure({
      amountNeededToAvoidOverdraftMinor: 50_000,
      anomalies: [
        {
          categorySlug: "groceries",
          baselineMinor: 10_000,
          currentMinor: 30_000,
          changeMinor: 20_000,
          changePercent: 200,
          sampleMonths: 3,
          projectedRemainingMinor: 5_000,
          severity: "high",
          canStillReduce: true,
          explanation: "",
        },
        {
          categorySlug: "fuel",
          baselineMinor: 5_000,
          currentMinor: 9_000,
          changeMinor: 4_000,
          changePercent: 80,
          sampleMonths: 3,
          projectedRemainingMinor: 0,
          severity: "high",
          canStillReduce: false,
          explanation: "",
        },
      ],
    });
    expect(summary).toEqual({
      aboveRecentUsualMinor: 24_000,
      alreadyHappenedMinor: 24_000,
      reducibleRemainingMinor: 5_000,
      cashGapRepairableMinor: 5_000,
    });
  });

  it("flags only a supported multi-month routine pattern and ignores a one-off", () => {
    const transactions = [
      transaction("a", "2026-04-10", 10_000),
      transaction("b", "2026-05-10", 12_000),
      transaction("c", "2026-06-10", 14_000),
      transaction("d", "2026-07-10", 16_000),
      transaction("one-off", "2026-07-11", 90_000, "one_off_unavoidable"),
    ];
    const patterns = detectRepeatedSpendingPatterns({
      transactions,
      reconciliation,
      asOfDate: "2026-07-18",
    });
    expect(patterns).toHaveLength(1);
    expect(patterns[0].consecutiveMonthlyIncreases).toBe(3);
    expect(patterns[0].latestMonthMinor).toBe(16_000);
  });
});
