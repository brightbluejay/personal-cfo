import { asc, desc, eq } from "drizzle-orm";
import {
  calculateSpendingBaseline,
  findSpendingAnomalies,
} from "@/src/domain/cfo/baseline";
import { buildCfoDiagnosis } from "@/src/domain/cfo/diagnosis";
import { buildBreakCycleRecoveryPlan } from "@/src/domain/cfo/cycle-recovery-plan";
import { buildDebtTrajectory } from "@/src/domain/cfo/debt-projection";
import { calculateFundingEnvelopes } from "@/src/domain/cfo/envelopes";
import {
  applyActionPlanToForecast,
  calculateCashForecast,
  type ForecastEvent,
} from "@/src/domain/cfo/forecast";
import { buildRecoveryPlan } from "@/src/domain/cfo/recovery-plan";
import { buildFinancialMilestones } from "@/src/domain/cfo/milestones";
import {
  detectRepeatedSpendingPatterns,
  summariseSpendingPressure,
} from "@/src/domain/cfo/spending-insights";
import {
  buildNarrativeFactPackage,
  withRecoveryPlan,
} from "@/src/domain/cfo/narrative-facts";
import { reconcileTransfers } from "@/src/domain/cfo/transfer-reconciliation";
import type {
  CfoAccount,
  CfoCategory,
  CfoTransaction,
} from "@/src/domain/cfo/types";
import { openDatabase } from "./connection";
import * as schema from "./schema";

function parseEnvelopeCategories(value: string) {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
}

function lastDayOfMonth(date: string) {
  const value = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() + 1);
  value.setUTCDate(0);
  return value.toISOString().slice(0, 10);
}

function withinForecast(
  date: string | null,
  asOfDate: string,
  monthEnd: string,
) {
  return Boolean(date && date > asOfDate && date <= monthEnd);
}

export function getCfoWorkspace() {
  const { db, sqlite } = openDatabase();
  try {
    const plan = db
      .select()
      .from(schema.monthlyPlans)
      .orderBy(desc(schema.monthlyPlans.month))
      .get();
    if (!plan) return null;
    const monthEndDate = lastDayOfMonth(plan.asOfDate);
    const currentMonth = plan.asOfDate.slice(0, 7);
    const accounts: CfoAccount[] = db
      .select()
      .from(schema.accounts)
      .all()
      .map((account) => ({
        id: account.id,
        name: account.name,
        ownership: account.ownership as CfoAccount["ownership"],
        role: account.role as CfoAccount["role"],
        purpose: account.purpose,
        balanceMinor: account.balanceMinor,
        envelopeCategorySlugs: parseEnvelopeCategories(
          account.envelopeCategoriesJson,
        ),
      }));
    const categories: CfoCategory[] = db
      .select()
      .from(schema.categories)
      .all()
      .map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        isEssential: category.isEssential,
        flexibility: category.flexibility as CfoCategory["flexibility"],
      }));
    const transactions: CfoTransaction[] = db
      .select({
        transaction: schema.transactions,
        categorySlug: schema.categories.slug,
      })
      .from(schema.transactions)
      .leftJoin(
        schema.categories,
        eq(schema.transactions.categoryId, schema.categories.id),
      )
      .orderBy(asc(schema.transactions.bookedDate))
      .all()
      .map(({ transaction, categorySlug }) => ({
        id: transaction.id,
        accountId: transaction.accountId,
        categoryId: transaction.categoryId,
        categorySlug,
        bookedDate: transaction.bookedDate,
        description: transaction.description,
        normalizedDescription: transaction.normalizedDescription,
        amountMinor: transaction.amountMinor,
        movementType:
          transaction.movementType as CfoTransaction["movementType"],
        spendingContext:
          transaction.spendingContext as CfoTransaction["spendingContext"],
        forecastBaselineEligible: transaction.forecastBaselineEligible,
        counterpartyAccountId: transaction.counterpartyAccountId,
        externalReference: transaction.externalReference,
      }));
    const income = db.select().from(schema.income).all();
    const commitments = db.select().from(schema.recurringCommitments).all();
    const upcoming = db.select().from(schema.upcomingExpenses).all();
    const sinking = db.select().from(schema.sinkingFunds).all();
    const debtRecords = db
      .select()
      .from(schema.debts)
      .orderBy(desc(schema.debts.aprBasisPoints))
      .all();
    const debtSnapshots = db
      .select()
      .from(schema.debtSnapshots)
      .orderBy(asc(schema.debtSnapshots.snapshotDate))
      .all();
    const reconciliation = reconcileTransfers(accounts, transactions);
    const baseline = calculateSpendingBaseline(
      transactions,
      reconciliation,
      plan.asOfDate,
    );
    const anomalies = findSpendingAnomalies(baseline, categories);
    const accessibleCashMinor = accounts
      .filter(
        (account) =>
          account.ownership === "owned" &&
          ["primary", "spending", "bills", "other"].includes(account.role),
      )
      .reduce((sum, account) => sum + account.balanceMinor, 0);
    const reservedSavingsMinor = accounts
      .filter(
        (account) =>
          account.ownership === "owned" &&
          ["savings", "emergency_fund"].includes(account.role),
      )
      .reduce((sum, account) => sum + account.balanceMinor, 0);
    const requiredDebtMinimumsMinor = debtRecords.reduce(
      (sum, debt) => sum + debt.minimumPaymentMinor,
      0,
    );
    const debtMinimumsPaidMinor = Math.min(
      requiredDebtMinimumsMinor,
      transactions
        .filter(
          (transaction) =>
            transaction.bookedDate.startsWith(currentMonth) &&
            transaction.bookedDate <= plan.asOfDate,
        )
        .filter(
          (transaction) =>
            (reconciliation.effectiveMovementTypes[transaction.id] ??
              transaction.movementType) === "debt_payment",
        )
        .reduce(
          (sum, transaction) => sum + Math.abs(transaction.amountMinor),
          0,
        ),
    );
    const debtMinimumsRemainingMinor = Math.max(
      0,
      requiredDebtMinimumsMinor - debtMinimumsPaidMinor,
    );
    const projectedRemainingSpendingMinor = baseline.reduce(
      (sum, item) => sum + item.projectedRemainingMinor,
      0,
    );
    const events: ForecastEvent[] = [
      ...income
        .filter(
          (item) =>
            item.certainty === "confirmed" &&
            withinForecast(item.expectedDate, plan.asOfDate, monthEndDate),
        )
        .map((item) => ({
          id: `income:${item.id}`,
          date: item.expectedDate!,
          amountMinor: item.amountMinor,
          kind: "income" as const,
          label: item.source,
          incomeType: item.kind,
        })),
      ...commitments
        .filter(
          (item) =>
            item.certainty === "confirmed" &&
            !item.isPaid &&
            withinForecast(item.nextDueDate, plan.asOfDate, monthEndDate),
        )
        .map((item) => ({
          id: `commitment:${item.id}`,
          date: item.nextDueDate!,
          amountMinor: -item.amountMinor,
          kind: "commitment" as const,
          label: item.name,
        })),
      ...upcoming
        .filter(
          (item) =>
            item.certainty === "confirmed" &&
            withinForecast(item.dueDate, plan.asOfDate, monthEndDate),
        )
        .map((item) => ({
          id: `upcoming:${item.id}`,
          date: item.dueDate,
          amountMinor: -item.amountMinor,
          kind: "upcoming" as const,
          label: item.description,
        })),
      ...sinking
        .filter((item) => item.certainty === "confirmed")
        .map((item) => ({
          id: `sinking:${item.id}`,
          date: monthEndDate,
          amountMinor: -item.monthlyContributionMinor,
          kind: "sinking" as const,
          label: item.name,
        })),
    ];
    if (debtMinimumsRemainingMinor > 0) {
      events.push({
        id: "debt-minimums-remaining",
        date: monthEndDate,
        amountMinor: -debtMinimumsRemainingMinor,
        kind: "debt_minimum",
        label: "Required debt minimums still due",
      });
    }
    if (projectedRemainingSpendingMinor > 0) {
      events.push({
        id: "recent-usual-spending-remaining",
        date: monthEndDate,
        amountMinor: -projectedRemainingSpendingMinor,
        kind: "routine_spending",
        label: "Recent usual spending still expected",
      });
    }
    const forecast = calculateCashForecast({
      asOfDate: plan.asOfDate,
      monthEndDate,
      accessibleCashMinor,
      reservedSavingsMinor,
      safetyCushionMinor: plan.protectedBufferMinor,
      events,
    });
    const recovery = buildRecoveryPlan({
      amountNeededToRestoreSafetyCushionMinor:
        forecast.amountNeededToRestoreSafetyCushionMinor,
      amountNeededToAvoidOverdraftMinor:
        forecast.amountNeededToAvoidOverdraftMinor,
      reservedSavingsMinor,
      baseline,
      categories,
    });
    const forecastAfterAction = applyActionPlanToForecast(forecast, recovery);
    const spendingSummary = summariseSpendingPressure({
      anomalies,
      amountNeededToAvoidOverdraftMinor:
        forecast.amountNeededToAvoidOverdraftMinor,
    });
    const repeatedSpendingPatterns = detectRepeatedSpendingPatterns({
      transactions,
      reconciliation,
      asOfDate: plan.asOfDate,
    });
    const envelopes = calculateFundingEnvelopes(
      accounts,
      transactions,
      reconciliation,
      `${currentMonth}-01`,
      plan.asOfDate,
    );
    const oneOffTransactions = transactions
      .filter(
        (item) =>
          item.bookedDate.startsWith(currentMonth) &&
          item.bookedDate <= plan.asOfDate &&
          item.spendingContext === "one_off_unavoidable",
      )
      .filter(
        (item) =>
          (reconciliation.effectiveMovementTypes[item.id] ??
            item.movementType) === "expense",
      )
      .map((item) => ({
        id: item.id,
        amountMinor: item.amountMinor,
        description: item.description,
      }));
    const firstIncomeDate = events
      .filter((event) => event.kind === "income")
      .map((event) => event.date)
      .sort()[0];
    const billsBeforeIncomeMinor = events
      .filter(
        (event) =>
          event.amountMinor < 0 &&
          (!firstIncomeDate || event.date < firstIncomeDate) &&
          event.kind !== "routine_spending",
      )
      .reduce((sum, event) => sum + Math.abs(event.amountMinor), 0);
    const diagnosis = buildCfoDiagnosis({
      forecast,
      billsBeforeIncomeMinor,
      anomalies,
      envelopes,
      transfers: reconciliation.groups,
      oneOffTransactions,
    });
    const priorityDebt = [...debtRecords].sort((left, right) => {
      const leftRate =
        left.promotionalAprBasisPoints !== null &&
        left.promotionalEndDate &&
        left.promotionalEndDate >= plan.asOfDate
          ? left.promotionalAprBasisPoints
          : left.aprBasisPoints;
      const rightRate =
        right.promotionalAprBasisPoints !== null &&
        right.promotionalEndDate &&
        right.promotionalEndDate >= plan.asOfDate
          ? right.promotionalAprBasisPoints
          : right.aprBasisPoints;
      return rightRate - leftRate || right.balanceMinor - left.balanceMinor;
    })[0];
    const debtAction = {
      requiredMinimumsMinor: requiredDebtMinimumsMinor,
      minimumsPaidMinor: debtMinimumsPaidMinor,
      minimumsRemainingMinor: debtMinimumsRemainingMinor,
      additionalPaymentSafeMinor: forecastAfterAction.safeToSpendNowMinor,
      priorityDebtName: priorityDebt?.name ?? null,
      priorityReason: priorityDebt
        ? "It has the highest current interest rate in the debt list."
        : "No debt is available to prioritise.",
      stabiliseCashFirst: forecastAfterAction.projectedOverdraftMinor > 0,
    };
    const debtTrajectory = buildDebtTrajectory({
      debts: debtRecords,
      snapshots: debtSnapshots,
      asOfDate: plan.asOfDate,
      safeExtraPaymentMinor: debtAction.additionalPaymentSafeMinor,
    });
    const milestones = buildFinancialMilestones({
      forecast,
      forecastAfterAction,
      debtTrajectory,
      plannedMonthlyImprovementMinor: recovery.spendingReductionMinor,
    });
    let household = { name: "Demo household", adults: 1, children: 0 };
    try {
      const assumptions = JSON.parse(plan.assumptionsJson) as {
        household?: { name?: string; adults?: number; children?: number };
      };
      household = {
        name: assumptions.household?.name ?? household.name,
        adults: assumptions.household?.adults ?? household.adults,
        children: assumptions.household?.children ?? household.children,
      };
    } catch {
      // Older local plans remain readable with the public-safe fallback persona.
    }
    const baseNarrativeFacts = buildNarrativeFactPackage({
      asOfDate: plan.asOfDate,
      householdName: household.name,
      adults: household.adults,
      children: household.children,
      transactions,
      categories,
      reconciliation,
      forecast,
      forecastAfterAction,
      recovery,
      milestones,
      debtTrajectory,
      debtRecords,
      debtPriorityName: debtAction.priorityDebtName,
      safeOptionalDebtPaymentMinor: debtAction.additionalPaymentSafeMinor,
      currentSinkingFundContributionMinor: 0,
    });
    const categorySlugsById = new Map(
      categories.map((category) => [category.id, category.slug]),
    );
    const normalisedMonthlyIncomeMinor = income
      .filter((item) => item.certainty === "confirmed")
      .reduce((sum, item) => sum + item.amountMinor, 0);
    const normalisedProtectedCostsMinor = commitments
      .filter(
        (item) =>
          item.certainty === "confirmed" && item.frequency === "monthly",
      )
      .reduce((sum, item) => sum + item.amountMinor, 0);
    const otherRecurringFundedAllocationsMinor = sinking
      .filter((item) => item.certainty === "confirmed")
      .reduce((sum, item) => sum + item.monthlyContributionMinor, 0);
    const savingsDestination = accounts.find(
      (account) => account.ownership === "owned" && account.role === "savings",
    );
    const savingsTransferEvidenceIds = reconciliation.groups
      .filter(
        (group) =>
          group.status === "matched" &&
          group.movementType === "savings_transfer",
      )
      .flatMap((group) =>
        group.transactionIds.map((id) => `transaction:${id}`),
      );
    const breakCyclePlan = buildBreakCycleRecoveryPlan({
      forecast,
      immediatePlan: recovery,
      categories,
      categoryFacts: baseNarrativeFacts.categoryVariances,
      subscriptionFacts: baseNarrativeFacts.subscriptions,
      unexpectedCostFact: baseNarrativeFacts.unexpectedCosts.find(
        (item) => item.id === "unexpected.monthly",
      ),
      normalisedMonthlyIncomeMinor,
      normalisedProtectedCostsMinor,
      normalisedDebtMinimumsMinor: requiredDebtMinimumsMinor,
      otherRecurringFundedAllocationsMinor,
      savingsRedirectionSource: {
        accountId: savingsDestination?.id ?? null,
        accountRole: savingsDestination?.role ?? null,
        accountPurpose: savingsDestination?.purpose ?? null,
        accountOwned: savingsDestination?.ownership === "owned",
        accountProtected: savingsDestination?.role === "emergency_fund",
        allocations: sinking
          .filter((item) => item.certainty === "confirmed")
          .map((item) => ({
            id: item.id,
            name: item.name,
            monthlyContributionMinor: item.monthlyContributionMinor,
            evidenceIds: [`sinking-fund:${item.id}`],
          })),
        transferEvidenceIds: savingsTransferEvidenceIds,
      },
      debts: debtRecords.map((debt) => ({
        id: debt.id,
        name: debt.name,
        balanceMinor: debt.balanceMinor,
        aprBasisPoints: debt.aprBasisPoints,
        minimumPaymentMinor: debt.minimumPaymentMinor,
        promotionalAprBasisPoints: debt.promotionalAprBasisPoints,
        promotionalEndDate: debt.promotionalEndDate,
        postPromotionalAprBasisPoints: debt.postPromotionalAprBasisPoints,
      })),
      excludedCategorySlugs: commitments.flatMap((item) => {
        const slug = item.categoryId
          ? categorySlugsById.get(item.categoryId)
          : undefined;
        return slug ? [slug] : [];
      }),
    });
    const narrativeFacts = withRecoveryPlan(baseNarrativeFacts, breakCyclePlan);
    const categoryNames = new Map(
      categories.map((category) => [category.slug, category.name]),
    );
    const spendingByCategory = new Map<string, number>();
    for (const transaction of transactions) {
      if (
        !transaction.bookedDate.startsWith(currentMonth) ||
        transaction.bookedDate > plan.asOfDate ||
        !transaction.categorySlug ||
        (reconciliation.effectiveMovementTypes[transaction.id] ??
          transaction.movementType) !== "expense"
      )
        continue;
      spendingByCategory.set(
        transaction.categorySlug,
        (spendingByCategory.get(transaction.categorySlug) ?? 0) +
          Math.abs(transaction.amountMinor),
      );
    }
    return {
      plan,
      accounts,
      categories,
      transactions,
      reconciliation,
      baseline,
      anomalies,
      spendingSummary,
      repeatedSpendingPatterns,
      envelopes,
      forecast,
      recovery,
      breakCyclePlan,
      forecastAfterAction,
      diagnosis,
      debtAction,
      debtRecords,
      debtTrajectory,
      milestones,
      narrativeFacts,
      currentMonthSpending: [...spendingByCategory.entries()]
        .map(([slug, amountMinor]) => ({
          slug,
          name: categoryNames.get(slug) ?? slug.replaceAll("-", " "),
          amountMinor,
        }))
        .sort((left, right) => right.amountMinor - left.amountMinor),
      protectedEvents: forecast.events.filter((event) =>
        ["commitment", "upcoming", "debt_minimum", "sinking"].includes(
          event.kind,
        ),
      ),
    };
  } finally {
    sqlite.close();
  }
}
