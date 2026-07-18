import type {
  CfoCategory,
  CfoTransaction,
  ReconciliationResult,
} from "./types";

export interface SpendingBaseline {
  categorySlug: string;
  baselineMinor: number;
  currentMinor: number;
  changeMinor: number;
  changePercent: number | null;
  sampleMonths: number;
  projectedRemainingMinor: number;
}

export interface SpendingAnomaly extends SpendingBaseline {
  severity: "watch" | "high";
  canStillReduce: boolean;
  explanation: string;
}

function monthKey(date: string) {
  return date.slice(0, 7);
}

function sameMonthDay(date: string, asOfDate: string) {
  return date.slice(8, 10) <= asOfDate.slice(8, 10);
}

export function calculateSpendingBaseline(
  transactions: CfoTransaction[],
  reconciliation: ReconciliationResult,
  asOfDate: string,
  lookbackMonths = 3,
): SpendingBaseline[] {
  const currentMonth = monthKey(asOfDate);
  const historicalMonths = Array.from(
    { length: lookbackMonths },
    (_, index) => {
      const date = new Date(`${currentMonth}-01T00:00:00Z`);
      date.setUTCMonth(date.getUTCMonth() - (index + 1));
      return date.toISOString().slice(0, 7);
    },
  );
  const byCategory = new Map<
    string,
    {
      current: number;
      historical: Map<string, number>;
      historicalRemaining: Map<string, number>;
    }
  >();

  for (const transaction of transactions) {
    const effectiveType =
      reconciliation.effectiveMovementTypes[transaction.id] ??
      transaction.movementType;
    if (effectiveType !== "expense" || !transaction.categorySlug) continue;
    if (transaction.forecastBaselineEligible === false) continue;
    if (transaction.spendingContext !== "routine") continue;
    const month = monthKey(transaction.bookedDate);
    if (month !== currentMonth && !historicalMonths.includes(month)) continue;
    const entry = byCategory.get(transaction.categorySlug) ?? {
      current: 0,
      historical: new Map<string, number>(),
      historicalRemaining: new Map<string, number>(),
    };
    if (month === currentMonth) {
      if (!sameMonthDay(transaction.bookedDate, asOfDate)) continue;
      entry.current += Math.abs(transaction.amountMinor);
    } else if (sameMonthDay(transaction.bookedDate, asOfDate)) {
      entry.historical.set(
        month,
        (entry.historical.get(month) ?? 0) + Math.abs(transaction.amountMinor),
      );
    } else {
      entry.historicalRemaining.set(
        month,
        (entry.historicalRemaining.get(month) ?? 0) +
          Math.abs(transaction.amountMinor),
      );
    }
    byCategory.set(transaction.categorySlug, entry);
  }

  return [...byCategory.entries()]
    .map(([categorySlug, entry]) => {
      const samples = historicalMonths.map(
        (month) => entry.historical.get(month) ?? 0,
      );
      const baselineMinor = samples.length
        ? Math.round(
            samples.reduce((sum, value) => sum + value, 0) / samples.length,
          )
        : 0;
      const remainingSamples = historicalMonths.map(
        (month) => entry.historicalRemaining.get(month) ?? 0,
      );
      const projectedRemainingMinor = remainingSamples.length
        ? Math.round(
            remainingSamples.reduce((sum, value) => sum + value, 0) /
              remainingSamples.length,
          )
        : 0;
      const changeMinor = entry.current - baselineMinor;
      return {
        categorySlug,
        baselineMinor,
        currentMinor: entry.current,
        changeMinor,
        changePercent: baselineMinor
          ? Math.round((changeMinor / baselineMinor) * 100)
          : null,
        sampleMonths: samples.filter((value) => value > 0).length,
        projectedRemainingMinor,
      };
    })
    .sort((left, right) => right.changeMinor - left.changeMinor);
}

export function findSpendingAnomalies(
  baseline: SpendingBaseline[],
  categories: CfoCategory[],
): SpendingAnomaly[] {
  const categoriesBySlug = new Map(
    categories.map((category) => [category.slug, category]),
  );
  return baseline
    .filter((item) => item.sampleMonths >= 2 && item.changeMinor >= 500)
    .filter(
      (item) =>
        categoriesBySlug.get(item.categorySlug)?.flexibility !== "protected",
    )
    .map((item) => ({
      ...item,
      severity:
        item.changePercent !== null && item.changePercent >= 50
          ? "high"
          : "watch",
      canStillReduce: item.projectedRemainingMinor > 0,
      explanation:
        item.projectedRemainingMinor > 0
          ? "There is still some usual spending left this month that could be reduced."
          : "The higher spending has already happened, so it is context rather than a reduction target.",
    }));
}
