import type { SpendingAnomaly } from "./baseline";
import type { CfoTransaction, ReconciliationResult } from "./types";

export interface SpendingInsightSummary {
  aboveRecentUsualMinor: number;
  alreadyHappenedMinor: number;
  reducibleRemainingMinor: number;
  cashGapRepairableMinor: number;
}

export interface RepeatedSpendingPattern {
  categorySlug: string;
  consecutiveMonthlyIncreases: number;
  latestMonthMinor: number;
  previousMonthMinor: number;
  explanation: string;
}

export function summariseSpendingPressure(input: {
  anomalies: SpendingAnomaly[];
  amountNeededToAvoidOverdraftMinor: number;
}): SpendingInsightSummary {
  const aboveRecentUsualMinor = input.anomalies.reduce(
    (sum, anomaly) => sum + Math.max(0, anomaly.changeMinor),
    0,
  );
  const reducibleRemainingMinor = input.anomalies.reduce(
    (sum, anomaly) =>
      sum + (anomaly.canStillReduce ? anomaly.projectedRemainingMinor : 0),
    0,
  );
  return {
    aboveRecentUsualMinor,
    alreadyHappenedMinor: aboveRecentUsualMinor,
    reducibleRemainingMinor,
    cashGapRepairableMinor: Math.min(
      reducibleRemainingMinor,
      input.amountNeededToAvoidOverdraftMinor,
    ),
  };
}

function priorMonths(asOfDate: string, count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(`${asOfDate.slice(0, 7)}-01T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() - (count - index - 1));
    return date.toISOString().slice(0, 7);
  });
}

export function detectRepeatedSpendingPatterns(input: {
  transactions: CfoTransaction[];
  reconciliation: ReconciliationResult;
  asOfDate: string;
  months?: number;
}): RepeatedSpendingPattern[] {
  const months = priorMonths(input.asOfDate, input.months ?? 4);
  const cutoffDay = input.asOfDate.slice(8, 10);
  const totals = new Map<string, Map<string, number>>();
  for (const transaction of input.transactions) {
    const effectiveType =
      input.reconciliation.effectiveMovementTypes[transaction.id] ??
      transaction.movementType;
    const month = transaction.bookedDate.slice(0, 7);
    if (
      effectiveType !== "expense" ||
      transaction.spendingContext !== "routine" ||
      !transaction.categorySlug ||
      !months.includes(month) ||
      transaction.bookedDate.slice(8, 10) > cutoffDay
    ) {
      continue;
    }
    const category = totals.get(transaction.categorySlug) ?? new Map();
    category.set(
      month,
      (category.get(month) ?? 0) + Math.abs(transaction.amountMinor),
    );
    totals.set(transaction.categorySlug, category);
  }

  return [...totals.entries()].flatMap(([categorySlug, byMonth]) => {
    const values = months.map((month) => byMonth.get(month) ?? 0);
    if (values.some((value) => value <= 0)) return [];
    let consecutiveMonthlyIncreases = 0;
    for (let index = values.length - 1; index > 0; index -= 1) {
      if (values[index] <= values[index - 1]) break;
      consecutiveMonthlyIncreases += 1;
    }
    if (consecutiveMonthlyIncreases < 2) return [];
    const latestMonthMinor = values.at(-1) ?? 0;
    const previousMonthMinor = values.at(-2) ?? 0;
    return [
      {
        categorySlug,
        consecutiveMonthlyIncreases,
        latestMonthMinor,
        previousMonthMinor,
        explanation: `Month-to-date routine spending has risen for ${consecutiveMonthlyIncreases} consecutive months. This is a repeated pattern, not an annual forecast.`,
      },
    ];
  });
}
