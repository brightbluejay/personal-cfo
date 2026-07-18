export type ForecastEventKind =
  | "income"
  | "commitment"
  | "upcoming"
  | "debt_minimum"
  | "sinking"
  | "routine_spending";

export interface ForecastEvent {
  id: string;
  date: string;
  amountMinor: number;
  kind: ForecastEventKind;
  label: string;
  incomeType?: string;
}

export type FinancialHealthClassification =
  | "healthy"
  | "tight_but_stable"
  | "relying_on_next_income"
  | "overdraft_cycle"
  | "worsening_debt_position";

export interface NextIncomeJourney {
  eventId: string;
  amountMinor: number;
  date: string;
  label: string;
  incomeType: string;
  balanceBeforeMinor: number;
  balanceAfterMinor: number;
  negativeBalanceClearedMinor: number;
  negativeBalanceClearedBasisPoints: number;
  commitmentsAfterIncomeMinor: number;
  protectedDebtPaymentsAfterIncomeMinor: number;
  remainingSpendingMinor: number;
  remainingAccessibleCashMinor: number;
  safetyCushionRequirementMinor: number;
  safetyCushionAllocationMinor: number;
  genuinelyUnallocatedMinor: number;
}

export interface CashForecast {
  asOfDate: string;
  monthEndDate: string;
  accessibleCashMinor: number;
  reservedSavingsMinor: number;
  expectedIncomeMinor: number;
  knownOutgoingsMinor: number;
  projectedRemainingSpendingMinor: number;
  projectedMonthEndBalanceMinor: number;
  lowestProjectedBalanceMinor: number;
  lowestProjectedBalanceDate: string;
  projectedOverdraftMinor: number;
  safetyCushionMinor: number;
  amountNeededToAvoidOverdraftMinor: number;
  amountNeededToRestoreSafetyCushionMinor: number;
  safeToSpendNowMinor: number;
  daysBelowZero: number;
  reliesOnFutureIncome: boolean;
  financialHealth: FinancialHealthClassification;
  financialHealthRule: string;
  nextIncome: NextIncomeJourney | null;
  status:
    | "safety_cushion_protected"
    | "safety_cushion_at_risk"
    | "projected_overdraft";
  events: ForecastEvent[];
}

function positionStatus(lowestMinor: number, safetyCushionMinor: number) {
  if (lowestMinor < 0) return "projected_overdraft" as const;
  if (lowestMinor < safetyCushionMinor)
    return "safety_cushion_at_risk" as const;
  return "safety_cushion_protected" as const;
}

function positionValues(
  projectedMonthEndBalanceMinor: number,
  lowestProjectedBalanceMinor: number,
  safetyCushionMinor: number,
) {
  return {
    projectedOverdraftMinor: Math.max(0, -lowestProjectedBalanceMinor),
    amountNeededToAvoidOverdraftMinor: Math.max(
      0,
      -lowestProjectedBalanceMinor,
    ),
    amountNeededToRestoreSafetyCushionMinor: Math.max(
      0,
      safetyCushionMinor - lowestProjectedBalanceMinor,
    ),
    safeToSpendNowMinor: Math.max(
      0,
      Math.min(
        projectedMonthEndBalanceMinor - safetyCushionMinor,
        lowestProjectedBalanceMinor - safetyCushionMinor,
      ),
    ),
    status: positionStatus(lowestProjectedBalanceMinor, safetyCushionMinor),
  };
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function classifyFinancialHealth(input: {
  projectedMonthEndBalanceMinor: number;
  lowestProjectedBalanceMinor: number;
  safetyCushionMinor: number;
  nextIncome: NextIncomeJourney | null;
}) {
  if (input.projectedMonthEndBalanceMinor < 0) {
    return {
      classification: "worsening_debt_position" as const,
      rule: "Month-end remains below zero after all confirmed income and obligations.",
    };
  }
  if (
    input.lowestProjectedBalanceMinor < 0 &&
    input.nextIncome &&
    (input.nextIncome.negativeBalanceClearedMinor >= input.safetyCushionMinor ||
      input.nextIncome.negativeBalanceClearedBasisPoints >= 1_000)
  ) {
    return {
      classification: "overdraft_cycle" as const,
      rule: "The account falls below zero before the next income, and at least the safety-cushion amount or 10% of that income is needed to clear it.",
    };
  }
  if (input.lowestProjectedBalanceMinor < 0 && input.nextIncome) {
    return {
      classification: "relying_on_next_income" as const,
      rule: "The account falls below zero and a later confirmed income returns it above zero.",
    };
  }
  if (input.lowestProjectedBalanceMinor < input.safetyCushionMinor) {
    return {
      classification: "tight_but_stable" as const,
      rule: "The account stays above zero but falls below the safety cushion.",
    };
  }
  return {
    classification: "healthy" as const,
    rule: "Every projected balance remains at or above the safety cushion.",
  };
}

export function calculateCashForecast(input: {
  asOfDate: string;
  monthEndDate: string;
  accessibleCashMinor: number;
  reservedSavingsMinor: number;
  safetyCushionMinor: number;
  events: ForecastEvent[];
}): CashForecast {
  const events = input.events
    .filter(
      (event) =>
        event.date > input.asOfDate && event.date <= input.monthEndDate,
    )
    .sort(
      (left, right) =>
        left.date.localeCompare(right.date) ||
        left.amountMinor - right.amountMinor ||
        left.id.localeCompare(right.id),
    );
  let runningBalanceMinor = input.accessibleCashMinor;
  let lowestProjectedBalanceMinor = runningBalanceMinor;
  let lowestProjectedBalanceDate = input.asOfDate;
  let nextIncome: NextIncomeJourney | null = null;
  for (const event of events) {
    const balanceBeforeMinor = runningBalanceMinor;
    runningBalanceMinor += event.amountMinor;
    if (runningBalanceMinor < lowestProjectedBalanceMinor) {
      lowestProjectedBalanceMinor = runningBalanceMinor;
      lowestProjectedBalanceDate = event.date;
    }
    if (!nextIncome && event.kind === "income") {
      const negativeBalanceClearedMinor = Math.min(
        event.amountMinor,
        Math.max(0, -balanceBeforeMinor),
      );
      nextIncome = {
        eventId: event.id,
        amountMinor: event.amountMinor,
        date: event.date,
        label: event.label,
        incomeType: event.incomeType ?? "other",
        balanceBeforeMinor,
        balanceAfterMinor: runningBalanceMinor,
        negativeBalanceClearedMinor,
        negativeBalanceClearedBasisPoints: event.amountMinor
          ? Math.round(
              (negativeBalanceClearedMinor / event.amountMinor) * 10_000,
            )
          : 0,
        commitmentsAfterIncomeMinor: 0,
        protectedDebtPaymentsAfterIncomeMinor: 0,
        remainingSpendingMinor: 0,
        remainingAccessibleCashMinor: 0,
        safetyCushionRequirementMinor: input.safetyCushionMinor,
        safetyCushionAllocationMinor: 0,
        genuinelyUnallocatedMinor: 0,
      };
    }
  }
  const projectedMonthEndBalanceMinor = runningBalanceMinor;
  const expectedIncomeMinor = events
    .filter((event) => event.amountMinor > 0)
    .reduce((sum, event) => sum + event.amountMinor, 0);
  const projectedRemainingSpendingMinor = events
    .filter((event) => event.kind === "routine_spending")
    .reduce((sum, event) => sum + Math.abs(event.amountMinor), 0);
  const knownOutgoingsMinor = events
    .filter(
      (event) => event.amountMinor < 0 && event.kind !== "routine_spending",
    )
    .reduce((sum, event) => sum + Math.abs(event.amountMinor), 0);
  let daysBelowZero = 0;
  let dailyBalanceMinor = input.accessibleCashMinor;
  for (
    let date = addDays(input.asOfDate, 1);
    date <= input.monthEndDate;
    date = addDays(date, 1)
  ) {
    for (const event of events.filter((item) => item.date === date)) {
      dailyBalanceMinor += event.amountMinor;
    }
    if (dailyBalanceMinor < 0) daysBelowZero += 1;
  }
  if (nextIncome) {
    const afterIncome = events.filter((event) => event.date > nextIncome!.date);
    const requiredCommitmentsAfterIncomeMinor = afterIncome
      .filter((event) =>
        ["commitment", "upcoming", "sinking"].includes(event.kind),
      )
      .reduce((sum, event) => sum + Math.abs(event.amountMinor), 0);
    const requiredDebtPaymentsAfterIncomeMinor = afterIncome
      .filter((event) => event.kind === "debt_minimum")
      .reduce((sum, event) => sum + Math.abs(event.amountMinor), 0);
    const requiredRemainingSpendingMinor = afterIncome
      .filter((event) => event.kind === "routine_spending")
      .reduce((sum, event) => sum + Math.abs(event.amountMinor), 0);
    let incomeRemainingMinor = Math.max(
      0,
      nextIncome.amountMinor - nextIncome.negativeBalanceClearedMinor,
    );
    nextIncome.commitmentsAfterIncomeMinor = Math.min(
      incomeRemainingMinor,
      requiredCommitmentsAfterIncomeMinor,
    );
    incomeRemainingMinor -= nextIncome.commitmentsAfterIncomeMinor;
    nextIncome.protectedDebtPaymentsAfterIncomeMinor = Math.min(
      incomeRemainingMinor,
      requiredDebtPaymentsAfterIncomeMinor,
    );
    incomeRemainingMinor -= nextIncome.protectedDebtPaymentsAfterIncomeMinor;
    nextIncome.remainingSpendingMinor = Math.min(
      incomeRemainingMinor,
      requiredRemainingSpendingMinor,
    );
    incomeRemainingMinor -= nextIncome.remainingSpendingMinor;
    nextIncome.remainingAccessibleCashMinor = incomeRemainingMinor;
    nextIncome.safetyCushionAllocationMinor = Math.min(
      incomeRemainingMinor,
      input.safetyCushionMinor,
    );
    nextIncome.genuinelyUnallocatedMinor =
      incomeRemainingMinor - nextIncome.safetyCushionAllocationMinor;
  }
  const health = classifyFinancialHealth({
    projectedMonthEndBalanceMinor,
    lowestProjectedBalanceMinor,
    safetyCushionMinor: input.safetyCushionMinor,
    nextIncome,
  });
  return {
    asOfDate: input.asOfDate,
    monthEndDate: input.monthEndDate,
    accessibleCashMinor: input.accessibleCashMinor,
    reservedSavingsMinor: input.reservedSavingsMinor,
    expectedIncomeMinor,
    knownOutgoingsMinor,
    projectedRemainingSpendingMinor,
    projectedMonthEndBalanceMinor,
    lowestProjectedBalanceMinor,
    lowestProjectedBalanceDate,
    safetyCushionMinor: input.safetyCushionMinor,
    daysBelowZero,
    reliesOnFutureIncome: Boolean(
      nextIncome && nextIncome.negativeBalanceClearedMinor > 0,
    ),
    financialHealth: health.classification,
    financialHealthRule: health.rule,
    nextIncome,
    ...positionValues(
      projectedMonthEndBalanceMinor,
      lowestProjectedBalanceMinor,
      input.safetyCushionMinor,
    ),
    events,
  };
}

export function applyActionPlanToForecast(
  forecast: CashForecast,
  action: {
    accessibleCashIncreaseMinor: number;
    spendingReductionMinor: number;
  },
): CashForecast {
  let remainingReductionMinor = action.spendingReductionMinor;
  const adjustedEvents = forecast.events.map((event) => {
    if (event.kind !== "routine_spending" || remainingReductionMinor <= 0) {
      return event;
    }
    const reductionMinor = Math.min(
      Math.abs(event.amountMinor),
      remainingReductionMinor,
    );
    remainingReductionMinor -= reductionMinor;
    return { ...event, amountMinor: event.amountMinor + reductionMinor };
  });
  const recalculated = calculateCashForecast({
    asOfDate: forecast.asOfDate,
    monthEndDate: forecast.monthEndDate,
    accessibleCashMinor:
      forecast.accessibleCashMinor + action.accessibleCashIncreaseMinor,
    reservedSavingsMinor: Math.max(
      0,
      forecast.reservedSavingsMinor - action.accessibleCashIncreaseMinor,
    ),
    safetyCushionMinor: forecast.safetyCushionMinor,
    events: adjustedEvents,
  });
  return recalculated;
}
