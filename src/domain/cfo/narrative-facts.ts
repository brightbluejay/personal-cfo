import { createHash } from "node:crypto";
import { z } from "zod";
import type { DebtTrajectory } from "./debt-projection";
import {
  calculateCategoryTrimDerivation,
  type BreakCycleRecoveryPlan,
} from "./cycle-recovery-plan";
import type { CashForecast } from "./forecast";
import type { FinancialMilestone } from "./milestones";
import type { RecoveryPlan } from "./recovery-plan";
import type {
  CfoCategory,
  CfoTransaction,
  ReconciliationResult,
} from "./types";

export const NARRATIVE_FACT_PACKAGE_VERSION = "cfo-facts-v5";

const factValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.null(),
  z.array(z.string()),
  z.array(z.number()),
]);

export const narrativeFactSchema = z
  .object({
    id: z.string().min(1),
    type: z.string().min(1),
    label: z.string().min(1),
    values: z.record(z.string(), factValueSchema),
    evidenceIds: z.array(z.string()).min(1),
    confidence: z.enum(["high", "medium", "limited"]),
    recommendationEligible: z.boolean(),
  })
  .strict();

export type NarrativeFact = z.infer<typeof narrativeFactSchema>;

export const narrativeFactPackageSchema = z
  .object({
    metadata: z
      .object({
        packageVersion: z.literal(NARRATIVE_FACT_PACKAGE_VERSION),
        packageHash: z.string().length(64),
        asOfDate: z.string(),
        householdName: z.string(),
        adults: z.number().int().positive(),
        children: z.number().int().nonnegative(),
        comparisonMonths: z.array(z.string()).length(3),
      })
      .strict(),
    financialPosition: z.array(narrativeFactSchema),
    incomeJourney: z.array(narrativeFactSchema),
    forecast: z.array(narrativeFactSchema),
    spending: z.array(narrativeFactSchema),
    categoryVariances: z.array(narrativeFactSchema),
    unexpectedCosts: z.array(narrativeFactSchema),
    subscriptions: z.array(narrativeFactSchema),
    transfersAndSavings: z.array(narrativeFactSchema),
    actions: z.array(narrativeFactSchema),
    milestones: z.array(narrativeFactSchema),
    debtPlan: z.array(narrativeFactSchema),
    recoveryPlan: z.array(narrativeFactSchema),
    purchaseScenario: z.array(narrativeFactSchema),
    evidenceIndex: z.record(z.string(), z.string()),
    dataQualityWarnings: z.array(z.string()),
    views: z
      .object({
        overviewFacts: z.array(z.string()),
        spendingFacts: z.array(z.string()),
        debtFacts: z.array(z.string()),
        actionPlanFacts: z.array(z.string()),
      })
      .strict(),
  })
  .strict();

export type CfoNarrativeFactPackage = z.infer<
  typeof narrativeFactPackageSchema
>;

function monthOffset(month: string, offset: number) {
  const date = new Date(`${month}-01T00:00:00Z`);
  date.setUTCMonth(date.getUTCMonth() + offset);
  return date.toISOString().slice(0, 7);
}

function median(values: number[]) {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function evidenceFor(transactions: CfoTransaction[]) {
  return transactions.map((item) => `transaction:${item.id}`);
}

function effectiveType(
  transaction: CfoTransaction,
  reconciliation: ReconciliationResult,
) {
  return (
    reconciliation.effectiveMovementTypes[transaction.id] ??
    transaction.movementType
  );
}

function direction(values: number[]) {
  if (values.length < 3 || values.some((value) => value <= 0)) {
    return "insufficient_history";
  }
  const materialChange =
    Math.abs(values.at(-1)! - values[0]) >=
    Math.max(500, Math.round(values[0] * 0.1));
  if (materialChange && values[0] < values[1] && values[1] < values[2]) {
    return "rising";
  }
  if (materialChange && values[0] > values[1] && values[1] > values[2]) {
    return "falling";
  }
  const average = Math.round(
    values.reduce((sum, value) => sum + value, 0) / values.length,
  );
  if (
    Math.max(...values) - Math.min(...values) <=
    Math.max(500, average * 0.1)
  ) {
    return "stable";
  }
  return "insufficient_history";
}

function fact(input: NarrativeFact): NarrativeFact {
  return narrativeFactSchema.parse(input);
}

function factIds(sections: NarrativeFact[][]) {
  return sections.flat().map((item) => item.id);
}

export function buildNarrativeFactPackage(input: {
  asOfDate: string;
  householdName: string;
  adults: number;
  children: number;
  transactions: CfoTransaction[];
  categories: CfoCategory[];
  reconciliation: ReconciliationResult;
  forecast: CashForecast;
  forecastAfterAction: CashForecast;
  recovery: RecoveryPlan;
  milestones: FinancialMilestone[];
  debtTrajectory: DebtTrajectory;
  debtRecords: Array<{
    name: string;
    balanceMinor: number;
    aprBasisPoints: number;
    minimumPaymentMinor: number;
    promotionalEndDate: string | null;
  }>;
  debtPriorityName: string | null;
  safeOptionalDebtPaymentMinor: number;
  currentSinkingFundContributionMinor?: number;
}): CfoNarrativeFactPackage {
  const currentMonth = input.asOfDate.slice(0, 7);
  const comparisonMonths = [-3, -2, -1].map((offset) =>
    monthOffset(currentMonth, offset),
  );
  const cutoffDay = input.asOfDate.slice(8, 10);
  const categoriesBySlug = new Map(
    input.categories.map((category) => [category.slug, category]),
  );
  const expenses = input.transactions.filter(
    (transaction) =>
      effectiveType(transaction, input.reconciliation) === "expense" &&
      transaction.categorySlug,
  );
  const evidenceIndex: Record<string, string> = {
    "calculation:dated-cash-forecast": "Dated cash forecast",
    "calculation:recovery-plan": "Protected recovery plan",
    "calculation:debt-projection": "Debt payoff projection",
    "calculation:category-comparison": "Comparable-month category calculation",
    "calculation:unexpected-costs": "Unexpected-cost history calculation",
    "calculation:subscriptions": "Recurring subscription calculation",
  };
  for (const transaction of input.transactions) {
    evidenceIndex[`transaction:${transaction.id}`] =
      `Transaction on ${transaction.bookedDate}`;
  }

  const financialPosition = [
    fact({
      id: "position.current",
      type: "money",
      label: "Accessible cash now",
      values: {
        amountMinor: input.forecast.accessibleCashMinor,
        date: input.forecast.asOfDate,
      },
      evidenceIds: ["calculation:dated-cash-forecast"],
      confidence: "high",
      recommendationEligible: false,
    }),
    fact({
      id: "position.health",
      type: "classification",
      label: "Financial health",
      values: {
        classification: input.forecast.financialHealth,
        rule: input.forecast.financialHealthRule,
      },
      evidenceIds: ["calculation:dated-cash-forecast"],
      confidence: "high",
      recommendationEligible: true,
    }),
  ];
  const incomeJourney = input.forecast.nextIncome
    ? [
        fact({
          id: "income.next",
          type: "income_journey",
          label: "Next confirmed income",
          values: {
            incomeType: input.forecast.nextIncome.incomeType,
            amountMinor: input.forecast.nextIncome.amountMinor,
            date: input.forecast.nextIncome.date,
            balanceBeforeMinor: input.forecast.nextIncome.balanceBeforeMinor,
            balanceAfterMinor: input.forecast.nextIncome.balanceAfterMinor,
            clearsNegativeMinor:
              input.forecast.nextIncome.negativeBalanceClearedMinor,
            clearsNegativeBasisPoints:
              input.forecast.nextIncome.negativeBalanceClearedBasisPoints,
          },
          evidenceIds: ["calculation:dated-cash-forecast"],
          confidence: "high",
          recommendationEligible: true,
        }),
      ]
    : [];
  const forecast = [
    fact({
      id: "forecast.lowest",
      type: "dated_money",
      label: "Lowest projected balance",
      values: {
        amountMinor: input.forecast.lowestProjectedBalanceMinor,
        date: input.forecast.lowestProjectedBalanceDate,
        daysBelowZero: input.forecast.daysBelowZero,
      },
      evidenceIds: ["calculation:dated-cash-forecast"],
      confidence: "high",
      recommendationEligible: true,
    }),
    fact({
      id: "forecast.month_end",
      type: "dated_money",
      label: "Projected month-end balance",
      values: {
        amountMinor: input.forecast.projectedMonthEndBalanceMinor,
        date: input.forecast.monthEndDate,
        safeToSpendMinor: input.forecast.safeToSpendNowMinor,
        requiredImprovementMinor:
          input.forecast.amountNeededToRestoreSafetyCushionMinor,
      },
      evidenceIds: ["calculation:dated-cash-forecast"],
      confidence: "high",
      recommendationEligible: true,
    }),
  ];

  const categorySlugs = [
    ...new Set(expenses.map((item) => item.categorySlug!)),
  ];
  const categoryVariances = categorySlugs.flatMap((categorySlug) => {
    const current = expenses.filter(
      (item) =>
        item.categorySlug === categorySlug &&
        item.bookedDate.startsWith(currentMonth) &&
        item.bookedDate.slice(8, 10) <= cutoffDay,
    );
    const sameDayTotals = comparisonMonths.map((month) =>
      expenses
        .filter(
          (item) =>
            item.categorySlug === categorySlug &&
            item.bookedDate.startsWith(month) &&
            item.bookedDate.slice(8, 10) <= cutoffDay,
        )
        .reduce((sum, item) => sum + Math.abs(item.amountMinor), 0),
    );
    const fullMonthTotals = comparisonMonths.map((month) =>
      expenses
        .filter(
          (item) =>
            item.categorySlug === categorySlug &&
            item.bookedDate.startsWith(month),
        )
        .reduce((sum, item) => sum + Math.abs(item.amountMinor), 0),
    );
    if (!current.length && fullMonthTotals.every((value) => value === 0)) {
      return [];
    }
    const typicalComparableMinor = Math.round(
      sameDayTotals.reduce((sum, value) => sum + value, 0) / 3,
    );
    const typicalFullMonthMinor = Math.round(
      fullMonthTotals.reduce((sum, value) => sum + value, 0) / 3,
    );
    const currentMinor = current.reduce(
      (sum, item) => sum + Math.abs(item.amountMinor),
      0,
    );
    const currentCount = current.length;
    const historicalCounts = comparisonMonths.map(
      (month) =>
        expenses.filter(
          (item) =>
            item.categorySlug === categorySlug &&
            item.bookedDate.startsWith(month) &&
            item.bookedDate.slice(8, 10) <= cutoffDay,
        ).length,
    );
    const typicalCount = Math.round(
      historicalCounts.reduce((sum, value) => sum + value, 0) / 3,
    );
    const category = categoriesBySlug.get(categorySlug);
    const projectedRemainingMinor = Math.max(
      0,
      typicalFullMonthMinor - typicalComparableMinor,
    );
    const reducibleRate =
      category?.flexibility === "flexible"
        ? 0.5
        : category?.flexibility === "limited"
          ? 0.2
          : 0;
    const categoryDerivation = calculateCategoryTrimDerivation({
      categorySlug,
      baselineMonthTotalsMinor: fullMonthTotals,
      sameDayComparableSpendMinor: typicalComparableMinor,
      currentMonthToDateSpendMinor: currentMinor,
      projectedCurrentMonthSpendMinor: currentMinor + projectedRemainingMinor,
      flexibleShareBasisPoints: Math.round(reducibleRate * 10_000),
    });
    const trend = direction(fullMonthTotals);
    const evidenceIds = [
      "calculation:category-comparison",
      ...evidenceFor(
        expenses.filter(
          (item) =>
            item.categorySlug === categorySlug &&
            (comparisonMonths.includes(item.bookedDate.slice(0, 7)) ||
              item.bookedDate.startsWith(currentMonth)),
        ),
      ),
    ];
    return [
      fact({
        id: `category.${categorySlug}`,
        type: "category_variance",
        label: category?.name ?? categorySlug.replaceAll("-", " "),
        values: {
          currentMinor,
          typicalComparableMinor,
          differenceMinor: currentMinor - typicalComparableMinor,
          differencePercent:
            typicalComparableMinor >= 1_000
              ? Math.round(
                  ((currentMinor - typicalComparableMinor) /
                    typicalComparableMinor) *
                    100,
                )
              : null,
          currentTransactionCount: currentCount,
          typicalTransactionCount: typicalCount,
          transactionCountDifference: currentCount - typicalCount,
          comparisonMonthsAboveTypical: sameDayTotals.filter(
            (value) => value > typicalComparableMinor,
          ).length,
          comparisonMonthsBelowTypical: sameDayTotals.filter(
            (value) => value < typicalComparableMinor,
          ).length,
          direction: trend,
          alreadyHappenedMinor: currentMinor,
          projectedRemainingMinor,
          realisticallyReducibleRemainingMinor: Math.round(
            projectedRemainingMinor * reducibleRate,
          ),
          pattern:
            trend === "rising" || trend === "falling"
              ? "repeated"
              : "one_off_or_unclear",
          baselineMonthTotalsMinor: fullMonthTotals,
          combinedBaselineTotalMinor:
            categoryDerivation.combinedBaselineTotalMinor,
          fullMonthTypicalSpendMinor:
            categoryDerivation.fullMonthTypicalSpendMinor,
          sameDayComparableSpendMinor:
            categoryDerivation.sameDayComparableSpendMinor,
          currentMonthToDateSpendMinor:
            categoryDerivation.currentMonthToDateSpendMinor,
          projectedCurrentMonthSpendMinor:
            categoryDerivation.projectedCurrentMonthSpendMinor,
          flexibleShareBasisPoints: categoryDerivation.flexibleShareBasisPoints,
          initialFlexibleAmountMinor:
            categoryDerivation.initialFlexibleAmountMinor,
          protectedMonthlyFloorMinor:
            categoryDerivation.protectedMonthlyFloorMinor,
          amountAboveProtectedFloorMinor:
            categoryDerivation.amountAboveProtectedFloorMinor,
          maximumReducibleMonthlyAmountMinor:
            categoryDerivation.maximumReducibleMonthlyAmountMinor,
          selectedMonthlyReductionMinor: 0,
          fullMonthTotalsMinor: fullMonthTotals,
        },
        evidenceIds,
        confidence: fullMonthTotals.every((value) => value > 0)
          ? "high"
          : "limited",
        recommendationEligible:
          reducibleRate > 0 &&
          (currentMinor > typicalComparableMinor || trend === "rising"),
      }),
    ];
  });

  const unexpected = expenses.filter(
    (item) =>
      item.categorySlug === "unexpected-costs" &&
      comparisonMonths.includes(item.bookedDate.slice(0, 7)) &&
      item.spendingContext === "one_off_unavoidable",
  );
  const unexpectedMonthly = comparisonMonths.map((month) => ({
    month,
    amountMinor: unexpected
      .filter((item) => item.bookedDate.startsWith(month))
      .reduce((sum, item) => sum + Math.abs(item.amountMinor), 0),
    count: unexpected.filter((item) => item.bookedDate.startsWith(month))
      .length,
  }));
  const unexpectedAmounts = unexpectedMonthly.map((item) => item.amountMinor);
  const unexpectedAverage = Math.round(
    unexpectedAmounts.reduce((sum, value) => sum + value, 0) / 3,
  );
  const suggestedSinkingFundMinor = Math.ceil(unexpectedAverage / 500) * 500;
  const currentSinkingFundContributionMinor =
    input.currentSinkingFundContributionMinor ?? 0;
  const unexpectedCosts = unexpected.length
    ? [
        fact({
          id: "unexpected.monthly",
          type: "unexpected_cost_summary",
          label: "Unexpected unavoidable costs",
          values: {
            months: unexpectedMonthly.map((item) => item.month),
            costsMinor: unexpectedAmounts,
            counts: unexpectedMonthly.map((item) => item.count),
            averageMonthlyMinor: unexpectedAverage,
            medianMonthlyMinor: median(unexpectedAmounts),
            highestMonthMinor: Math.max(...unexpectedAmounts),
            lowestMonthMinor: Math.min(...unexpectedAmounts),
            suggestedSinkingFundMinor,
            currentSinkingFundContributionMinor,
            fundingGapMinor: Math.max(
              0,
              suggestedSinkingFundMinor - currentSinkingFundContributionMinor,
            ),
            categories: ["Unexpected costs"],
          },
          evidenceIds: [
            "calculation:unexpected-costs",
            ...evidenceFor(unexpected),
          ],
          confidence: "medium",
          recommendationEligible: true,
        }),
      ]
    : [];

  const subscriptionTransactions = expenses.filter(
    (item) => item.categorySlug === "subscriptions",
  );
  const byService = new Map<string, CfoTransaction[]>();
  for (const transaction of subscriptionTransactions) {
    const service = transaction.normalizedDescription;
    byService.set(service, [...(byService.get(service) ?? []), transaction]);
  }
  const subscriptions = [...byService.entries()].map(
    ([service, items], index) => {
      const monthlyCostMinor = Math.round(
        items.reduce((sum, item) => sum + Math.abs(item.amountMinor), 0) /
          items.length,
      );
      const latest = [...items].sort((a, b) =>
        b.bookedDate.localeCompare(a.bookedDate),
      )[0];
      return fact({
        id: `subscription.${index + 1}`,
        type: "subscription",
        label: latest.description,
        values: {
          service,
          monthlyCostMinor,
          chargesObserved: items.length,
          observationDates: items.map((item) => item.bookedDate).sort(),
          annualisedCostMinor: monthlyCostMinor * 12,
          usageKnown: false,
          cancellationSavingMinor: monthlyCostMinor,
          nextExpectedChargeDate: latest.bookedDate.startsWith(currentMonth)
            ? monthOffset(currentMonth, 1) + latest.bookedDate.slice(7)
            : null,
        },
        evidenceIds: ["calculation:subscriptions", ...evidenceFor(items)],
        confidence: items.length >= 3 ? "high" : "limited",
        recommendationEligible: items.length >= 3,
      });
    },
  );
  if (subscriptions.length) {
    subscriptions.push(
      fact({
        id: "subscription.summary",
        type: "subscription_summary",
        label: "Recurring subscriptions",
        values: {
          monthlyCostMinor: subscriptions.reduce(
            (sum, item) => sum + Number(item.values.monthlyCostMinor ?? 0),
            0,
          ),
          annualisedCostMinor: subscriptions.reduce(
            (sum, item) => sum + Number(item.values.annualisedCostMinor ?? 0),
            0,
          ),
          servicesObserved: subscriptions.length,
          usageKnown: false,
        },
        evidenceIds: [
          "calculation:subscriptions",
          ...evidenceFor(subscriptionTransactions),
        ],
        confidence: "high",
        recommendationEligible: true,
      }),
    );
  }

  const spending = [
    fact({
      id: "spending.comparison_scope",
      type: "comparison_scope",
      label: "Comparable household spending history",
      values: {
        completeMonths: comparisonMonths,
        currentMonth,
        transactionCount: expenses.length,
      },
      evidenceIds: ["calculation:category-comparison"],
      confidence: "high",
      recommendationEligible: false,
    }),
  ];
  const transfersAndSavings = [
    fact({
      id: "transfers.reconciled",
      type: "transfer_summary",
      label: "Matched transfers excluded from spending",
      values: {
        matchedGroups: input.reconciliation.groups.filter(
          (group) => group.status === "matched",
        ).length,
        unresolvedTransactions:
          input.reconciliation.unresolvedTransactionIds.length,
        reservedSavingsMinor: input.forecast.reservedSavingsMinor,
      },
      evidenceIds: ["calculation:category-comparison"],
      confidence: "high",
      recommendationEligible: false,
    }),
  ];
  const actions = input.recovery.actions.map((action) =>
    fact({
      id: `action.${action.id}`,
      type: "deterministic_action",
      label: action.title,
      values: {
        actionId: action.id,
        explanation: action.explanation,
        improvementMinor: action.improvementMinor,
      },
      evidenceIds: ["calculation:recovery-plan"],
      confidence: "high",
      recommendationEligible: true,
    }),
  );
  const milestones = input.milestones.map((milestone) =>
    fact({
      id: `milestone.${milestone.stage}`,
      type: "milestone",
      label: milestone.title,
      values: {
        stage: milestone.stage,
        targetMinor: milestone.targetMinor,
        estimatedDate: milestone.estimatedDate,
        requiredMonthlyImprovementMinor:
          milestone.requiredMonthlyImprovementMinor,
        delayReason: milestone.delayReason,
      },
      evidenceIds: ["calculation:recovery-plan"],
      confidence: milestone.estimatedDate ? "high" : "limited",
      recommendationEligible: true,
    }),
  );
  const debtPlan = [
    fact({
      id: "debt.plan",
      type: "debt_plan",
      label: "Deterministic debt route",
      values: {
        currentBalanceMinor: input.debtTrajectory.currentBalanceMinor,
        requiredPaymentsMinor: input.debtRecords.reduce(
          (sum, debt) => sum + debt.minimumPaymentMinor,
          0,
        ),
        safeOptionalPaymentMinor: input.safeOptionalDebtPaymentMinor,
        priorityDebt: input.debtPriorityName,
        currentPayoffDate: input.debtTrajectory.currentPlan.payoffDate,
        currentProjectedInterestMinor:
          input.debtTrajectory.currentPlan.totalInterestMinor,
        sustainableExtraPaymentMinor:
          input.debtTrajectory.alternativeExtraPaymentMinor,
        sustainablePayoffDate: input.debtTrajectory.alternativePlan.payoffDate,
        balanceChangeMinor: input.debtTrajectory.balanceChangeMinor,
        increasedDespitePayments: input.debtTrajectory.increasedDespitePayments,
        promotionalExpiryDates: input.debtRecords
          .map((debt) => debt.promotionalEndDate)
          .filter((date): date is string => Boolean(date)),
      },
      evidenceIds: ["calculation:debt-projection"],
      confidence: "high",
      recommendationEligible: true,
    }),
  ];
  const purchaseScenario: NarrativeFact[] = [];
  const recoveryPlan: NarrativeFact[] = [];
  const allSections = [
    financialPosition,
    incomeJourney,
    forecast,
    spending,
    categoryVariances,
    unexpectedCosts,
    subscriptions,
    transfersAndSavings,
    actions,
    milestones,
    debtPlan,
    recoveryPlan,
    purchaseScenario,
  ];
  const overviewFacts = factIds([
    financialPosition,
    incomeJourney,
    forecast,
    categoryVariances.filter((item) => item.recommendationEligible),
    unexpectedCosts,
    subscriptions,
    actions,
    milestones.slice(0, 2),
  ]);
  const spendingFacts = factIds([
    spending,
    categoryVariances,
    unexpectedCosts,
    subscriptions,
  ]);
  const debtFacts = factIds([debtPlan]);
  const actionPlanFacts = factIds([
    financialPosition,
    incomeJourney,
    forecast,
    spending,
    categoryVariances.filter((item) => item.recommendationEligible),
    unexpectedCosts,
    subscriptions,
    actions,
    milestones,
    debtPlan,
  ]);
  const unhashed = {
    metadata: {
      packageVersion: NARRATIVE_FACT_PACKAGE_VERSION,
      asOfDate: input.asOfDate,
      householdName: input.householdName,
      adults: input.adults,
      children: input.children,
      comparisonMonths,
    },
    facts: allSections.flat(),
    evidenceIndex,
    dataQualityWarnings: [
      "Three complete comparison months support cautious patterns, not long-term forecasts.",
      "Expanded coaching history is excluded from the calibrated remainder-of-month forecast so the approved cash result is unchanged.",
      "Subscription usage and value are unknown; the ledger proves charges, not usefulness.",
    ],
    views: { overviewFacts, spendingFacts, debtFacts, actionPlanFacts },
  };
  const packageHash = createHash("sha256")
    .update(JSON.stringify(unhashed))
    .digest("hex");
  return narrativeFactPackageSchema.parse({
    metadata: { ...unhashed.metadata, packageHash },
    financialPosition,
    incomeJourney,
    forecast,
    spending,
    categoryVariances,
    unexpectedCosts,
    subscriptions,
    transfersAndSavings,
    actions,
    milestones,
    debtPlan,
    recoveryPlan,
    purchaseScenario,
    evidenceIndex,
    dataQualityWarnings: unhashed.dataQualityWarnings,
    views: unhashed.views,
  });
}

export function withRecoveryPlan(
  packageValue: CfoNarrativeFactPackage,
  plan: BreakCycleRecoveryPlan,
) {
  const immediate = fact({
    id: "recovery.immediate",
    type: "immediate_plan_summary",
    label: "Immediate plan for the current month",
    values: {
      accessibleSavingsTimingMinor:
        plan.immediatePlan.accessibleCashIncreaseMinor,
      remainingSpendingReductionMinor:
        plan.immediatePlan.spendingReductionMinor,
      totalImmediateImprovementMinor: plan.immediatePlan.totalImprovementMinor,
      immediateRemainingGapMinor: plan.immediatePlan.remainingGapMinor,
      savingsExcludedFromRecurringPlan: true,
    },
    evidenceIds: ["calculation:recovery-plan"],
    confidence: "high",
    recommendationEligible: true,
  });
  const flowIncome = fact({
    id: "recovery.flow.income",
    type: "normalised_recurring_income",
    label: "Normalised recurring monthly income",
    values: {
      normalisedMonthlyIncomeMinor:
        plan.recurringFlow.normalisedMonthlyIncomeMinor,
    },
    evidenceIds: ["calculation:normalised-monthly-cycle"],
    confidence: "high",
    recommendationEligible: true,
  });
  const flowOutgoings = fact({
    id: "recovery.flow.outgoings",
    type: "normalised_recurring_outgoings",
    label: "Normalised recurring monthly outgoings",
    values: {
      normalisedProtectedCostsMinor:
        plan.recurringFlow.normalisedProtectedCostsMinor,
      normalisedDebtMinimumsMinor:
        plan.recurringFlow.normalisedDebtMinimumsMinor,
      normalisedEssentialSpendingMinor:
        plan.recurringFlow.normalisedEssentialSpendingMinor,
      normalisedFlexibleSpendingMinor:
        plan.recurringFlow.normalisedFlexibleSpendingMinor,
      expectedSubscriptionsMinor: plan.recurringFlow.expectedSubscriptionsMinor,
      otherRecurringFundedAllocationsMinor:
        plan.recurringFlow.otherRecurringFundedAllocationsMinor,
      normalisedOutgoingsBeforeNewProvisionMinor:
        plan.recurringFlow.normalisedOutgoingsBeforeNewProvisionMinor,
      irregularCostProvisionMinor:
        plan.recurringFlow.irregularCostProvisionMinor,
      totalNormalisedMonthlyOutgoingsMinor:
        plan.recurringFlow.totalNormalisedMonthlyOutgoingsMinor,
      existingRecurringGapBeforeIrregularCostsMinor:
        plan.recurringFlow.existingRecurringGapBeforeIrregularCostsMinor,
      fullyFundedRecurringGapBeforePlanMinor:
        plan.recurringFlow.fullyFundedRecurringGapBeforePlanMinor,
    },
    evidenceIds: plan.recurringFlow.evidenceIds,
    confidence: "high",
    recommendationEligible: true,
  });
  const flowStatus = fact({
    id: "recovery.flow.status",
    type: "recurring_flow_status",
    label: "Recurring monthly cycle before the new plan",
    values: {
      surplusOrDeficitBeforePlanMinor:
        plan.recurringFlow.surplusOrDeficitBeforePlanMinor,
      recurringGapBeforePlanMinor:
        plan.recurringFlow.recurringGapBeforePlanMinor,
      recurringSurplusBeforePlanMinor:
        plan.recurringFlow.recurringSurplusBeforePlanMinor,
      requiredImprovementToBreakEvenMinor:
        plan.recurringFlow.requiredImprovementToBreakEvenMinor,
      requiredImprovementForHealthyCycleMinor:
        plan.recurringFlow.requiredImprovementForHealthyCycleMinor,
      safetyCushionIsStockTarget: true,
      timingBacklogIsNotMonthlyDeficit: true,
    },
    evidenceIds: plan.recurringFlow.evidenceIds,
    confidence: "high",
    recommendationEligible: true,
  });
  const candidateFacts = plan.recurringActions.candidates.map((candidate) =>
    fact({
      id: `recovery.action.candidate.${candidate.actionId}`,
      type: "recurring_plan_candidate",
      label: candidate.title,
      values: {
        actionId: candidate.actionId,
        kind: candidate.kind,
        reason: candidate.reason,
        selectionRank: candidate.selectionRank,
        selected: candidate.selected,
        selectedValueMinor: candidate.selectedValueMinor,
        countsAgainstSpendingChangeCap:
          candidate.countsAgainstSpendingChangeCap,
        exclusionReasonCode: candidate.exclusionReasonCode,
        exclusionExplanation: candidate.exclusionExplanation,
        monthlyReductionMinor: candidate.monthlyReductionMinor,
        annualisedReductionMinor: candidate.annualisedReductionMinor,
        nextExpectedChargeDate: candidate.nextExpectedChargeDate,
        categorySlug: candidate.categoryDerivation?.categorySlug ?? null,
        baselineMonthTotalsMinor:
          candidate.categoryDerivation?.baselineMonthTotalsMinor ?? [],
        combinedBaselineTotalMinor:
          candidate.categoryDerivation?.combinedBaselineTotalMinor ?? null,
        fullMonthTypicalSpendMinor:
          candidate.categoryDerivation?.fullMonthTypicalSpendMinor ?? null,
        sameDayComparableSpendMinor:
          candidate.categoryDerivation?.sameDayComparableSpendMinor ?? null,
        currentMonthToDateSpendMinor:
          candidate.categoryDerivation?.currentMonthToDateSpendMinor ?? null,
        projectedCurrentMonthSpendMinor:
          candidate.categoryDerivation?.projectedCurrentMonthSpendMinor ?? null,
        flexibleShareBasisPoints:
          candidate.categoryDerivation?.flexibleShareBasisPoints ?? null,
        initialFlexibleAmountMinor:
          candidate.categoryDerivation?.initialFlexibleAmountMinor ?? null,
        protectedMonthlyFloorMinor:
          candidate.categoryDerivation?.protectedMonthlyFloorMinor ?? null,
        amountAboveProtectedFloorMinor:
          candidate.categoryDerivation?.amountAboveProtectedFloorMinor ?? null,
        maximumReducibleMonthlyAmountMinor:
          candidate.categoryDerivation?.maximumReducibleMonthlyAmountMinor ??
          candidate.monthlyReductionMinor,
        selectedMonthlyReductionMinor: candidate.selected
          ? candidate.monthlyReductionMinor
          : 0,
        chargesObserved: candidate.chargesObserved,
        observationHistory: candidate.observationHistory,
        currentSavingsTransferMinor:
          candidate.savingsRedirectDerivation?.currentSavingsTransferMinor ??
          null,
        currentDestinationAccountRole:
          candidate.savingsRedirectDerivation?.currentDestinationAccountRole ??
          null,
        currentDestinationPurpose:
          candidate.savingsRedirectDerivation?.currentDestinationPurpose ??
          null,
        currentPurposeNames:
          candidate.savingsRedirectDerivation?.currentPurposeNames ?? [],
        proposedTemporaryPurpose:
          candidate.savingsRedirectDerivation?.proposedTemporaryPurpose ?? null,
        redirectedToIrregularCostsMinor:
          candidate.savingsRedirectDerivation
            ?.redirectedToIrregularCostsMinor ?? null,
        remainingAfterIrregularCostsMinor:
          candidate.savingsRedirectDerivation
            ?.remainingAfterIrregularCostsMinor ?? null,
        newlyRequiredForIrregularCostsMinor:
          candidate.savingsRedirectDerivation
            ?.newlyRequiredForIrregularCostsMinor ?? null,
        netOutgoingsChangeAgainstExistingFlowMinor:
          candidate.savingsRedirectDerivation
            ?.netOutgoingsChangeAgainstExistingFlowMinor ?? null,
        netOutgoingsChangeAgainstFullyFundedPlanMinor:
          candidate.savingsRedirectDerivation
            ?.netOutgoingsChangeAgainstFullyFundedPlanMinor ?? null,
        resumeCondition:
          candidate.savingsRedirectDerivation?.resumeCondition ?? null,
        reconciliationHolds:
          candidate.savingsRedirectDerivation?.reconciliationHolds ?? null,
        usageKnown: candidate.usageKnown,
        userConfirmationRequired: candidate.userConfirmationRequired,
      },
      evidenceIds: candidate.evidenceIds,
      confidence: candidate.confidence,
      recommendationEligible: true,
    }),
  );
  const selectedFacts = plan.recurringActions.selectedActions.map((candidate) =>
    fact({
      id: `recovery.action.selected.${candidate.actionId}`,
      type: "selected_recurring_change",
      label: candidate.title,
      values: {
        actionId: candidate.actionId,
        kind: candidate.kind,
        reason: candidate.reason,
        selectionRank: candidate.selectionRank,
        selected: candidate.selected,
        selectedValueMinor: candidate.selectedValueMinor,
        countsAgainstSpendingChangeCap:
          candidate.countsAgainstSpendingChangeCap,
        monthlyReductionMinor: candidate.monthlyReductionMinor,
        categorySlug: candidate.categoryDerivation?.categorySlug ?? null,
        baselineMonthTotalsMinor:
          candidate.categoryDerivation?.baselineMonthTotalsMinor ?? [],
        combinedBaselineTotalMinor:
          candidate.categoryDerivation?.combinedBaselineTotalMinor ?? null,
        fullMonthTypicalSpendMinor:
          candidate.categoryDerivation?.fullMonthTypicalSpendMinor ?? null,
        sameDayComparableSpendMinor:
          candidate.categoryDerivation?.sameDayComparableSpendMinor ?? null,
        currentMonthToDateSpendMinor:
          candidate.categoryDerivation?.currentMonthToDateSpendMinor ?? null,
        projectedCurrentMonthSpendMinor:
          candidate.categoryDerivation?.projectedCurrentMonthSpendMinor ?? null,
        flexibleShareBasisPoints:
          candidate.categoryDerivation?.flexibleShareBasisPoints ?? null,
        initialFlexibleAmountMinor:
          candidate.categoryDerivation?.initialFlexibleAmountMinor ?? null,
        protectedMonthlyFloorMinor:
          candidate.categoryDerivation?.protectedMonthlyFloorMinor ?? null,
        amountAboveProtectedFloorMinor:
          candidate.categoryDerivation?.amountAboveProtectedFloorMinor ?? null,
        maximumReducibleMonthlyAmountMinor:
          candidate.categoryDerivation?.maximumReducibleMonthlyAmountMinor ??
          candidate.monthlyReductionMinor,
        selectedMonthlyReductionMinor: candidate.monthlyReductionMinor,
        currentSavingsTransferMinor:
          candidate.savingsRedirectDerivation?.currentSavingsTransferMinor ??
          null,
        redirectedToIrregularCostsMinor:
          candidate.savingsRedirectDerivation
            ?.redirectedToIrregularCostsMinor ?? null,
        newlyRequiredForIrregularCostsMinor:
          candidate.savingsRedirectDerivation
            ?.newlyRequiredForIrregularCostsMinor ?? null,
        remainingAfterIrregularCostsMinor:
          candidate.savingsRedirectDerivation
            ?.remainingAfterIrregularCostsMinor ?? null,
        proposedTemporaryPurpose:
          candidate.savingsRedirectDerivation?.proposedTemporaryPurpose ?? null,
        resumeCondition:
          candidate.savingsRedirectDerivation?.resumeCondition ?? null,
        userConfirmationRequired: candidate.userConfirmationRequired,
      },
      evidenceIds: candidate.evidenceIds,
      confidence: candidate.confidence,
      recommendationEligible: true,
    }),
  );
  const irregular = fact({
    id: "recovery.irregular_cost_fund",
    type: "funded_irregular_cost_allocation",
    label: "Fund irregular household costs",
    values: {
      monthlyAllocationMinor:
        plan.irregularCostAllocation.monthlyAllocationMinor,
      basis: plan.irregularCostAllocation.basis,
      historicalMonths: plan.irregularCostAllocation.historicalMonths,
      historicalCostsMinor: plan.irregularCostAllocation.historicalCostsMinor,
      currentContributionMinor:
        plan.irregularCostAllocation.currentContributionMinor,
      fundingGapMinor: plan.irregularCostAllocation.fundingGapMinor,
      treatment: "funded_once_by_new_plan",
      redirectedExistingSavingsMinor:
        plan.recurringActions.redirectedToIrregularCostsMinor,
      genuinelyNewContributionMinor:
        plan.recurringActions.newlyFundedAllocationsMinor,
      limitation: plan.irregularCostAllocation.limitation,
    },
    evidenceIds: plan.irregularCostAllocation.evidenceIds,
    confidence: "medium",
    recommendationEligible: true,
  });
  const actionsSummary = fact({
    id: "recovery.actions.summary",
    type: "recurring_actions_summary",
    label: "Selected recurring actions",
    values: {
      grossMonthlySavingsMinor: plan.recurringActions.grossMonthlySavingsMinor,
      redirectActionsSelectedCount:
        plan.recurringActions.redirectActionsSelectedCount,
      spendingChangeActionsSelectedCount:
        plan.recurringActions.spendingChangeActionsSelectedCount,
      totalDisplayedPlanLines: plan.recurringActions.totalDisplayedPlanLines,
      maximumSpendingChangeActions:
        plan.recurringActions.maximumSpendingChangeActions,
      grossMonthlyReductionsMinor:
        plan.recurringActions.grossMonthlyReductionsMinor,
      redirectedExistingAllocationMinor:
        plan.recurringActions.redirectedExistingAllocationMinor,
      redirectedToIrregularCostsMinor:
        plan.recurringActions.redirectedToIrregularCostsMinor,
      redirectRemainingAfterIrregularCostsMinor:
        plan.recurringActions.redirectRemainingAfterIrregularCostsMinor,
      newlyFundedAllocationsMinor:
        plan.recurringActions.newlyFundedAllocationsMinor,
      correctedOutgoingsBeforeReductionsMinor:
        plan.recurringActions.correctedOutgoingsBeforeReductionsMinor,
      correctedRecurringGapBeforeReductionsMinor:
        plan.recurringActions.correctedRecurringGapBeforeReductionsMinor,
      totalMonthlyOutgoingsAfterPlanMinor:
        plan.recurringActions.totalMonthlyOutgoingsAfterPlanMinor,
      netMonthlyImprovementMinor:
        plan.recurringActions.netMonthlyImprovementMinor,
      recurringGapBeforePlanMinor:
        plan.recurringFlow.recurringGapBeforePlanMinor,
      remainingRecurringGapMinor:
        plan.recurringActions.remainingRecurringGapMinor,
      recurringCoverageBasisPoints:
        plan.recurringActions.recurringCoverageBasisPoints,
      balanceAfterPlanMinor: plan.recurringActions.balanceAfterPlanMinor,
      structurallyBalanced: plan.recurringActions.structurallyBalanced,
      planStatus: plan.recurringActions.status,
      selectedActionIds: plan.recurringActions.selectedActions.map(
        (candidate) => candidate.actionId,
      ),
      userDecisionsRequired: plan.userDecisionsRequired,
    },
    evidenceIds: plan.evidenceIds,
    confidence: "high",
    recommendationEligible: true,
  });
  const backlog = fact({
    id: "recovery.backlog",
    type: "one_off_recovery_backlog",
    label: "One-off backlog and cushion rebuilding",
    values: {
      amountToZeroMinor: plan.backlog.amountToZeroMinor,
      cushionToRebuildMinor: plan.backlog.cushionToRebuildMinor,
      totalBacklogMinor: plan.backlog.totalBacklogMinor,
      immediateReductionMinor: plan.backlog.immediateReductionMinor,
      remainingAmountToZeroMinor: plan.backlog.remainingAmountToZeroMinor,
      remainingBacklogMinor: plan.backlog.remainingBacklogMinor,
      monthlyReductionCapacityMinor: plan.backlog.monthlyReductionCapacityMinor,
      monthsToClearAmountToZero: plan.backlog.monthsToClearAmountToZero,
      monthsToRestoreCushion: plan.backlog.monthsToRestoreCushion,
      expectedAmountToZeroDate: plan.backlog.expectedAmountToZeroDate,
      expectedCushionRestoredDate: plan.backlog.expectedCushionRestoredDate,
      backlogIsOneOffStock: true,
    },
    evidenceIds: [
      "calculation:dated-cash-forecast",
      "calculation:normalised-monthly-cycle",
    ],
    confidence: "high",
    recommendationEligible: true,
  });
  const milestoneFacts = plan.milestonesUnderPlan.map((milestone) =>
    fact({
      id: `recovery.milestone.${milestone.id}`,
      type: "recovery_plan_milestone",
      label: milestone.title,
      values: {
        estimatedDate: milestone.estimatedDate,
        monthlyBacklogReductionMinor: milestone.monthlyBacklogReductionMinor,
        remainingBacklogForMilestoneMinor:
          milestone.remainingBacklogForMilestoneMinor,
        additionalMonthlyImprovementRequiredMinor:
          milestone.additionalMonthlyImprovementRequiredMinor,
        assumptions: milestone.assumptions,
        limitation: milestone.limitation,
      },
      evidenceIds: milestone.evidenceIds,
      confidence: milestone.confidence,
      recommendationEligible: true,
    }),
  );
  const debtEffect = fact({
    id: "recovery.debt_effect",
    type: "recovery_debt_effect",
    label: "Debt effect under the selected plan",
    values: {
      safeOptionalPaymentMinor: plan.debtEffect.safeOptionalPaymentMinor,
      optionalOverpaymentStartDate:
        plan.debtEffect.optionalOverpaymentStartDate,
      revisedDebtFreeDate: plan.debtEffect.revisedDebtFreeDate,
      currentDebtFreeDate: plan.debtEffect.currentDebtFreeDate,
      limitation: plan.debtEffect.limitation,
    },
    evidenceIds: ["calculation:debt-projection"],
    confidence: "limited",
    recommendationEligible: true,
  });
  const recoveryPlan = [
    immediate,
    flowIncome,
    flowOutgoings,
    flowStatus,
    ...candidateFacts,
    ...selectedFacts,
    irregular,
    actionsSummary,
    backlog,
    ...milestoneFacts,
    debtEffect,
  ];
  const selectedByCategory = new Map(
    plan.recurringActions.selectedActions.flatMap((candidate) =>
      candidate.categoryDerivation
        ? [
            [
              candidate.categoryDerivation.categorySlug,
              candidate.monthlyReductionMinor,
            ] as const,
          ]
        : [],
    ),
  );
  const categoryVariances = packageValue.categoryVariances.map((item) => {
    const slug = item.id.replace(/^category\./, "");
    return fact({
      ...item,
      values: {
        ...item.values,
        selectedMonthlyReductionMinor: selectedByCategory.get(slug) ?? 0,
      },
    });
  });
  const packageHash = createHash("sha256")
    .update(
      JSON.stringify({
        basePackageHash: packageValue.metadata.packageHash,
        categoryVariances,
        recoveryPlan,
        assumptions: plan.assumptions,
      }),
    )
    .digest("hex");
  return narrativeFactPackageSchema.parse({
    ...packageValue,
    metadata: { ...packageValue.metadata, packageHash },
    categoryVariances,
    recoveryPlan,
    evidenceIndex: {
      ...packageValue.evidenceIndex,
      "calculation:break-cycle-plan": "Break-the-cycle recovery plan",
      "calculation:normalised-monthly-cycle":
        "Normalised recurring monthly income and outgoings",
      "calculation:savings-redirection":
        "Reconciliation of existing recurring savings contributions to the monthly surprise-cost requirement",
      ...Object.fromEntries(
        plan.recurringActions.candidates
          .flatMap((candidate) => candidate.evidenceIds)
          .filter((id) => id.startsWith("sinking-fund:"))
          .map((id) => [id, "Confirmed recurring savings contribution"]),
      ),
    },
    dataQualityWarnings: [
      ...packageValue.dataQualityWarnings,
      ...plan.assumptions,
    ],
    views: {
      ...packageValue.views,
      overviewFacts: [
        ...packageValue.views.overviewFacts,
        flowOutgoings.id,
        flowStatus.id,
        actionsSummary.id,
        backlog.id,
        ...selectedFacts
          .filter((item) => item.values.kind === "savings_redirect")
          .map((item) => item.id),
        ...milestoneFacts
          .filter((item) => item.id === "recovery.milestone.finish_above_zero")
          .map((item) => item.id),
      ],
      actionPlanFacts: [
        ...packageValue.views.actionPlanFacts,
        ...recoveryPlan.map((item) => item.id),
      ],
    },
  });
}

export function factsForView(
  packageValue: CfoNarrativeFactPackage,
  view: keyof CfoNarrativeFactPackage["views"],
) {
  const allowed = new Set(packageValue.views[view]);
  const all = [
    ...packageValue.financialPosition,
    ...packageValue.incomeJourney,
    ...packageValue.forecast,
    ...packageValue.spending,
    ...packageValue.categoryVariances,
    ...packageValue.unexpectedCosts,
    ...packageValue.subscriptions,
    ...packageValue.transfersAndSavings,
    ...packageValue.actions,
    ...packageValue.milestones,
    ...packageValue.debtPlan,
    ...packageValue.recoveryPlan,
    ...packageValue.purchaseScenario,
  ];
  return all.filter((item) => allowed.has(item.id));
}

export function withPurchaseScenario(
  packageValue: CfoNarrativeFactPackage,
  scenario: {
    amountMinor: number;
    date: string;
    result: "safe" | "risky" | "unsafe";
    afterPurchaseLowestBalanceMinor: number;
    afterPurchaseMonthEndMinor: number;
  },
) {
  const scenarioFact = fact({
    id: "scenario.purchase",
    type: "purchase_scenario",
    label: "Active purchase decision",
    values: scenario,
    evidenceIds: ["calculation:purchase-scenario"],
    confidence: "high",
    recommendationEligible: true,
  });
  const packageHash = createHash("sha256")
    .update(
      JSON.stringify({
        basePackageHash: packageValue.metadata.packageHash,
        scenario: scenarioFact,
      }),
    )
    .digest("hex");
  return narrativeFactPackageSchema.parse({
    ...packageValue,
    metadata: { ...packageValue.metadata, packageHash },
    purchaseScenario: [scenarioFact],
    evidenceIndex: {
      ...packageValue.evidenceIndex,
      "calculation:purchase-scenario": "Deterministic purchase scenario",
    },
    views: {
      ...packageValue.views,
      overviewFacts: [
        ...packageValue.views.overviewFacts.filter(
          (id) => id !== scenarioFact.id,
        ),
        scenarioFact.id,
      ],
    },
  });
}
