import type { CashForecast } from "./forecast";

export interface PurchaseScenario {
  amountMinor: number;
  date: string;
  result: "safe" | "risky" | "unsafe";
  maximumSafeAmountMinor: number;
  beforeActionMonthEndMinor: number;
  afterActionMonthEndMinor: number;
  afterPurchaseMonthEndMinor: number;
  afterPurchaseLowestBalanceMinor: number;
  amountNeededToRestoreSafetyCushionMinor: number;
  explanation: string;
}

export function simulatePurchase(input: {
  beforeAction: CashForecast;
  afterAction: CashForecast;
  amountMinor: number;
  date: string;
}): PurchaseScenario {
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) {
    throw new Error("A purchase scenario requires a positive amount.");
  }
  if (
    input.date < input.afterAction.asOfDate ||
    input.date > input.afterAction.monthEndDate
  ) {
    throw new Error("The purchase date must be within the current forecast.");
  }
  const maximumSafeAmountMinor = input.afterAction.safeToSpendNowMinor;
  const afterPurchaseMonthEndMinor =
    input.afterAction.projectedMonthEndBalanceMinor - input.amountMinor;
  const afterPurchaseLowestBalanceMinor =
    input.afterAction.lowestProjectedBalanceMinor - input.amountMinor;
  const amountNeededToRestoreSafetyCushionMinor = Math.max(
    0,
    input.afterAction.safetyCushionMinor - afterPurchaseLowestBalanceMinor,
  );
  const result =
    maximumSafeAmountMinor > 0 && input.amountMinor <= maximumSafeAmountMinor
      ? "safe"
      : afterPurchaseLowestBalanceMinor < 0
        ? "unsafe"
        : "risky";
  return {
    amountMinor: input.amountMinor,
    date: input.date,
    result,
    maximumSafeAmountMinor,
    beforeActionMonthEndMinor: input.beforeAction.projectedMonthEndBalanceMinor,
    afterActionMonthEndMinor: input.afterAction.projectedMonthEndBalanceMinor,
    afterPurchaseMonthEndMinor,
    afterPurchaseLowestBalanceMinor,
    amountNeededToRestoreSafetyCushionMinor,
    explanation:
      result === "safe"
        ? "The purchase keeps every projected balance above the safety cushion after the action plan."
        : result === "risky"
          ? "The purchase stays above overdraft but would use part of the safety cushion."
          : "The purchase would deepen a projected overdraft, even after the action plan.",
  };
}
