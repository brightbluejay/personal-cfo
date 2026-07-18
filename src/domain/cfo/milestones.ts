import type { DebtTrajectory } from "./debt-projection";
import type { CashForecast } from "./forecast";

export type MilestoneStage =
  "now" | "next_payday" | "month_end" | "healthy_cash_flow" | "debt_free";

export interface FinancialMilestone {
  stage: MilestoneStage;
  title: string;
  targetMinor: number;
  estimatedDate: string | null;
  requiredMonthlyImprovementMinor: number | null;
  assumptions: string[];
  delayReason: string | null;
}

export function buildFinancialMilestones(input: {
  forecast: CashForecast;
  forecastAfterAction: CashForecast;
  debtTrajectory: DebtTrajectory;
  plannedMonthlyImprovementMinor: number;
}): FinancialMilestone[] {
  const nextIncome = input.forecast.nextIncome;
  const canNamePayday = nextIncome?.incomeType === "salary";
  return [
    {
      stage: "now",
      title: "Stop the current cash gap getting worse",
      targetMinor: input.forecast.amountNeededToAvoidOverdraftMinor,
      estimatedDate: null,
      requiredMonthlyImprovementMinor: null,
      assumptions: [
        "All confirmed obligations remain protected.",
        "Only recorded accessible cash and reducible routine spending count.",
      ],
      delayReason:
        input.forecastAfterAction.projectedOverdraftMinor > 0
          ? "The recorded actions do not fully close the pre-income cash gap."
          : null,
    },
    {
      stage: "next_payday",
      title: canNamePayday
        ? "Reach the next payday without deeper borrowing"
        : "Reach the next confirmed income without deeper borrowing",
      targetMinor: input.forecast.projectedOverdraftMinor,
      estimatedDate: nextIncome?.date ?? null,
      requiredMonthlyImprovementMinor: null,
      assumptions: [
        "The next confirmed income arrives on the recorded date.",
        "No unrecorded spending occurs before it arrives.",
      ],
      delayReason: nextIncome
        ? null
        : "No future confirmed income date is recorded.",
    },
    {
      stage: "month_end",
      title: "Finish the month above zero with the cushion restored",
      targetMinor: input.forecast.safetyCushionMinor,
      estimatedDate:
        input.forecastAfterAction.lowestProjectedBalanceMinor >=
        input.forecast.safetyCushionMinor
          ? input.forecast.monthEndDate
          : null,
      requiredMonthlyImprovementMinor: null,
      assumptions: [
        "The dated month-end forecast contains every confirmed obligation.",
        "The safety cushion remains protected rather than available to spend.",
      ],
      delayReason:
        input.forecastAfterAction.lowestProjectedBalanceMinor <
        input.forecast.safetyCushionMinor
          ? "The current plan still falls below the safety cushion; another full month of dated income and obligations is needed before estimating a recovery date."
          : null,
    },
    {
      stage: "healthy_cash_flow",
      title: "Create repeatable monthly headroom",
      targetMinor: input.forecast.safetyCushionMinor,
      estimatedDate: null,
      requiredMonthlyImprovementMinor:
        input.plannedMonthlyImprovementMinor > 0
          ? input.plannedMonthlyImprovementMinor
          : null,
      assumptions: [
        "A healthy cycle stays above the cushion without using future income to clear a negative balance.",
        "Optional debt overpayments start only after that condition is repeatable.",
      ],
      delayReason:
        "Only one current-month forecast is available, so sustainable monthly headroom cannot yet be dated.",
    },
    {
      stage: "debt_free",
      title: "Clear all recorded consumer debt",
      targetMinor: input.debtTrajectory.currentBalanceMinor,
      estimatedDate: input.debtTrajectory.currentPlan.payoffDate,
      requiredMonthlyImprovementMinor:
        input.debtTrajectory.currentPlan.monthlyExtraPaymentMinor,
      assumptions: input.debtTrajectory.assumptions,
      delayReason: input.debtTrajectory.currentPlan.payoffDate
        ? null
        : "The recorded minimum-payment plan does not clear the balances within the projection limit.",
    },
  ];
}
