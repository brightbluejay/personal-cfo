import type { CashForecast } from "./forecast";
import { projectDebtPayoff, type DebtProjectionDebt } from "./debt-projection";
import type { RecoveryPlan } from "./recovery-plan";
import type { CfoCategory } from "./types";

export type RecurringPlanCandidateKind =
  "savings_redirect" | "subscription" | "category_trim";
export type RecurringPlanConfidence = "high" | "medium" | "limited";
export type CandidateExclusionReason =
  | "insufficient_recurrence"
  | "maximum_item_limit"
  | "protected_or_inaccessible"
  | "no_supported_value";

export interface RecurringFundedAllocationSource {
  id: string;
  name: string;
  monthlyContributionMinor: number;
  evidenceIds: string[];
}

export interface SavingsRedirectionSource {
  accountId: string | null;
  accountRole: string | null;
  accountPurpose: string | null;
  accountOwned: boolean;
  accountProtected: boolean;
  allocations: RecurringFundedAllocationSource[];
  transferEvidenceIds: string[];
}

export interface SavingsRedirectDerivation {
  currentSavingsTransferMinor: number;
  currentDestinationAccountId: string | null;
  currentDestinationAccountRole: string | null;
  currentDestinationPurpose: string | null;
  currentPurposeNames: string[];
  proposedTemporaryPurpose: string;
  redirectedToIrregularCostsMinor: number;
  remainingAfterIrregularCostsMinor: number;
  newlyRequiredForIrregularCostsMinor: number;
  formerPurposeOutgoingsChangeMinor: number;
  irregularCostOutgoingsChangeMinor: number;
  netOutgoingsChangeAgainstExistingFlowMinor: number;
  netOutgoingsChangeAgainstFullyFundedPlanMinor: number;
  userConfirmationRequired: true;
  resumeCondition: string;
  reconciliationHolds: boolean;
}

export interface CategoryTrimDerivation {
  categorySlug: string;
  baselineMonthTotalsMinor: number[];
  combinedBaselineTotalMinor: number;
  fullMonthTypicalSpendMinor: number;
  sameDayComparableSpendMinor: number;
  currentMonthToDateSpendMinor: number;
  projectedCurrentMonthSpendMinor: number;
  flexibleShareBasisPoints: number;
  initialFlexibleAmountMinor: number;
  protectedMonthlyFloorMinor: number;
  amountAboveProtectedFloorMinor: number;
  maximumReducibleMonthlyAmountMinor: number;
  selectedMonthlyReductionMinor: number;
}

export interface RecurringPlanCandidate {
  actionId: string;
  kind: RecurringPlanCandidateKind;
  title: string;
  reason: string;
  monthlyReductionMinor: number;
  annualisedReductionMinor: number;
  nextExpectedChargeDate: string | null;
  categoryDerivation: CategoryTrimDerivation | null;
  savingsRedirectDerivation: SavingsRedirectDerivation | null;
  chargesObserved: number | null;
  observationHistory: string[];
  evidenceIds: string[];
  confidence: RecurringPlanConfidence;
  usageKnown: boolean | null;
  userConfirmationRequired: boolean;
  countsAgainstSpendingChangeCap: boolean;
  selectionRank: number;
  selected: boolean;
  selectedValueMinor: number;
  exclusionReasonCode: CandidateExclusionReason | null;
  exclusionExplanation: string | null;
}

export interface IrregularCostAllocation {
  monthlyAllocationMinor: number;
  basis: "three_month_average";
  historicalMonths: string[];
  historicalCostsMinor: number[];
  currentContributionMinor: number;
  fundingGapMinor: number;
  evidenceIds: string[];
  limitation: string;
}

export interface RecurringFlowPlan {
  normalisedMonthlyIncomeMinor: number;
  normalisedProtectedCostsMinor: number;
  normalisedDebtMinimumsMinor: number;
  normalisedEssentialSpendingMinor: number;
  normalisedFlexibleSpendingMinor: number;
  expectedSubscriptionsMinor: number;
  otherRecurringFundedAllocationsMinor: number;
  normalisedOutgoingsBeforeNewProvisionMinor: number;
  irregularCostProvisionMinor: number;
  totalNormalisedMonthlyOutgoingsMinor: number;
  existingRecurringGapBeforeIrregularCostsMinor: number;
  fullyFundedRecurringGapBeforePlanMinor: number;
  surplusOrDeficitBeforePlanMinor: number;
  recurringGapBeforePlanMinor: number;
  recurringSurplusBeforePlanMinor: number;
  requiredImprovementToBreakEvenMinor: number;
  requiredImprovementForHealthyCycleMinor: number;
  assumptions: string[];
  evidenceIds: string[];
}

export interface RecurringActionsPlan {
  candidates: RecurringPlanCandidate[];
  selectedActions: RecurringPlanCandidate[];
  redirectActionsSelectedCount: number;
  spendingChangeActionsSelectedCount: number;
  totalDisplayedPlanLines: number;
  maximumSpendingChangeActions: number;
  grossMonthlySavingsMinor: number;
  grossMonthlyReductionsMinor: number;
  redirectedExistingAllocationMinor: number;
  redirectedToIrregularCostsMinor: number;
  redirectRemainingAfterIrregularCostsMinor: number;
  newlyFundedAllocationsMinor: number;
  correctedOutgoingsBeforeReductionsMinor: number;
  correctedRecurringGapBeforeReductionsMinor: number;
  totalMonthlyOutgoingsAfterPlanMinor: number;
  netMonthlyImprovementMinor: number;
  remainingRecurringGapMinor: number;
  recurringCoverageBasisPoints: number;
  structurallyBalanced: boolean;
  balanceAfterPlanMinor: number;
  status: "structurally_balanced" | "recurring_shortfall";
}

export interface RecoveryBacklog {
  amountToZeroMinor: number;
  cushionToRebuildMinor: number;
  totalBacklogMinor: number;
  immediateReductionMinor: number;
  remainingAmountToZeroMinor: number;
  remainingBacklogMinor: number;
  monthlyReductionCapacityMinor: number;
  monthsToClearAmountToZero: number | null;
  monthsToRestoreCushion: number | null;
  expectedAmountToZeroDate: string | null;
  expectedCushionRestoredDate: string | null;
}

export interface RecoveryPlanMilestone {
  id:
    | "finish_above_zero"
    | "restore_cushion"
    | "healthy_cycle"
    | "savings_redirect_review"
    | "safe_optional_overpayment";
  title: string;
  estimatedDate: string | null;
  monthlyBacklogReductionMinor: number;
  remainingBacklogForMilestoneMinor: number;
  additionalMonthlyImprovementRequiredMinor: number;
  assumptions: string[];
  evidenceIds: string[];
  confidence: "high" | "limited";
  limitation: string | null;
}

export interface RecoveryDebtEffect {
  safeOptionalPaymentMinor: number;
  optionalOverpaymentStartDate: string | null;
  revisedDebtFreeDate: string | null;
  currentDebtFreeDate: string | null;
  limitation: string;
}

export interface BreakCycleRecoveryPlan {
  immediatePlan: RecoveryPlan;
  recurringFlow: RecurringFlowPlan;
  recurringActions: RecurringActionsPlan;
  irregularCostAllocation: IrregularCostAllocation;
  backlog: RecoveryBacklog;
  milestonesUnderPlan: RecoveryPlanMilestone[];
  debtEffect: RecoveryDebtEffect;
  userDecisionsRequired: string[];
  assumptions: string[];
  evidenceIds: string[];
}

interface FactInput {
  id: string;
  label: string;
  type: string;
  values: Record<
    string,
    string | number | boolean | null | string[] | number[]
  >;
  evidenceIds: string[];
  confidence: "high" | "medium" | "limited";
  recommendationEligible: boolean;
}

function numberValue(fact: FactInput, key: string) {
  const value = fact.values[key];
  return typeof value === "number" ? value : 0;
}

function stringValue(fact: FactInput, key: string) {
  const value = fact.values[key];
  return typeof value === "string" ? value : null;
}

function numberArray(fact: FactInput, key: string) {
  const value = fact.values[key];
  return Array.isArray(value) && value.every((item) => typeof item === "number")
    ? value
    : [];
}

function stringArray(fact: FactInput, key: string) {
  const value = fact.values[key];
  return Array.isArray(value) && value.every((item) => typeof item === "string")
    ? value
    : [];
}

function stableSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function monthEndAfter(date: string, months: number) {
  const value = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() + months + 1);
  value.setUTCDate(0);
  return value.toISOString().slice(0, 10);
}

export function calculateCategoryTrimDerivation(input: {
  categorySlug: string;
  baselineMonthTotalsMinor: number[];
  sameDayComparableSpendMinor: number;
  currentMonthToDateSpendMinor: number;
  projectedCurrentMonthSpendMinor: number;
  flexibleShareBasisPoints: number;
  selectedMonthlyReductionMinor?: number;
}): CategoryTrimDerivation {
  const combinedBaselineTotalMinor = input.baselineMonthTotalsMinor.reduce(
    (sum, value) => sum + value,
    0,
  );
  const fullMonthTypicalSpendMinor = input.baselineMonthTotalsMinor.length
    ? Math.round(
        combinedBaselineTotalMinor / input.baselineMonthTotalsMinor.length,
      )
    : 0;
  const flexibleRate = input.flexibleShareBasisPoints / 10_000;
  const protectedMonthlyFloorMinor = Math.round(
    fullMonthTypicalSpendMinor * (1 - flexibleRate),
  );
  const initialFlexibleAmountMinor = Math.max(
    0,
    fullMonthTypicalSpendMinor - protectedMonthlyFloorMinor,
  );
  const amountAboveProtectedFloorMinor = Math.max(
    0,
    input.projectedCurrentMonthSpendMinor - protectedMonthlyFloorMinor,
  );
  const maximumReducibleMonthlyAmountMinor = Math.min(
    initialFlexibleAmountMinor,
    amountAboveProtectedFloorMinor,
  );
  return {
    categorySlug: input.categorySlug,
    baselineMonthTotalsMinor: input.baselineMonthTotalsMinor,
    combinedBaselineTotalMinor,
    fullMonthTypicalSpendMinor,
    sameDayComparableSpendMinor: input.sameDayComparableSpendMinor,
    currentMonthToDateSpendMinor: input.currentMonthToDateSpendMinor,
    projectedCurrentMonthSpendMinor: input.projectedCurrentMonthSpendMinor,
    flexibleShareBasisPoints: input.flexibleShareBasisPoints,
    initialFlexibleAmountMinor,
    protectedMonthlyFloorMinor,
    amountAboveProtectedFloorMinor,
    maximumReducibleMonthlyAmountMinor,
    selectedMonthlyReductionMinor: Math.min(
      input.selectedMonthlyReductionMinor ?? 0,
      maximumReducibleMonthlyAmountMinor,
    ),
  };
}

export function calculateRecurringPlanOutcome(input: {
  surplusOrDeficitBeforePlanMinor: number;
  recurringGapBeforePlanMinor: number;
  grossMonthlySavingsMinor: number;
  newlyFundedAllocationsMinor: number;
  redirectedToIrregularCostsMinor?: number;
  redirectRemainingAfterIrregularCostsMinor?: number;
}) {
  const netMonthlyImprovementMinor =
    input.grossMonthlySavingsMinor -
    input.newlyFundedAllocationsMinor +
    (input.redirectRemainingAfterIrregularCostsMinor ?? 0);
  const balanceAfterPlanMinor =
    input.surplusOrDeficitBeforePlanMinor + netMonthlyImprovementMinor;
  const remainingRecurringGapMinor = Math.max(0, -balanceAfterPlanMinor);
  const supportedGapCoverageMinor =
    input.grossMonthlySavingsMinor +
    (input.redirectedToIrregularCostsMinor ?? 0) +
    (input.redirectRemainingAfterIrregularCostsMinor ?? 0);
  const recurringCoverageBasisPoints = input.recurringGapBeforePlanMinor
    ? Math.min(
        10_000,
        Math.max(
          0,
          Math.round(
            (supportedGapCoverageMinor / input.recurringGapBeforePlanMinor) *
              10_000,
          ),
        ),
      )
    : 10_000;
  return {
    netMonthlyImprovementMinor,
    balanceAfterPlanMinor,
    remainingRecurringGapMinor,
    recurringCoverageBasisPoints,
    supportedGapCoverageMinor,
    monthlyBacklogReductionMinor: Math.max(0, balanceAfterPlanMinor),
  };
}

export function calculateBacklogSchedule(input: {
  amountToZeroMinor: number;
  cushionToRebuildMinor: number;
  immediateReductionMinor: number;
  monthlyReductionCapacityMinor: number;
  planMonthEnd: string;
}): RecoveryBacklog {
  const totalBacklogMinor =
    input.amountToZeroMinor + input.cushionToRebuildMinor;
  const immediateReductionMinor = Math.min(
    totalBacklogMinor,
    input.immediateReductionMinor,
  );
  const remainingAmountToZeroMinor = Math.max(
    0,
    input.amountToZeroMinor - immediateReductionMinor,
  );
  const remainingBacklogMinor = Math.max(
    0,
    totalBacklogMinor - immediateReductionMinor,
  );
  let amountToZeroRemaining = remainingAmountToZeroMinor;
  let totalRemaining = remainingBacklogMinor;
  let monthsToClearAmountToZero: number | null =
    amountToZeroRemaining <= 0 ? 0 : null;
  let monthsToRestoreCushion: number | null = totalRemaining <= 0 ? 0 : null;
  if (input.monthlyReductionCapacityMinor > 0) {
    for (let month = 1; month <= 1_200; month += 1) {
      amountToZeroRemaining = Math.max(
        0,
        amountToZeroRemaining - input.monthlyReductionCapacityMinor,
      );
      totalRemaining = Math.max(
        0,
        totalRemaining - input.monthlyReductionCapacityMinor,
      );
      if (monthsToClearAmountToZero === null && amountToZeroRemaining === 0) {
        monthsToClearAmountToZero = month;
      }
      if (monthsToRestoreCushion === null && totalRemaining === 0) {
        monthsToRestoreCushion = month;
      }
      if (
        monthsToClearAmountToZero !== null &&
        monthsToRestoreCushion !== null
      ) {
        break;
      }
    }
  }
  return {
    amountToZeroMinor: input.amountToZeroMinor,
    cushionToRebuildMinor: input.cushionToRebuildMinor,
    totalBacklogMinor,
    immediateReductionMinor,
    remainingAmountToZeroMinor,
    remainingBacklogMinor,
    monthlyReductionCapacityMinor: input.monthlyReductionCapacityMinor,
    monthsToClearAmountToZero,
    monthsToRestoreCushion,
    expectedAmountToZeroDate:
      monthsToClearAmountToZero === null
        ? null
        : monthEndAfter(input.planMonthEnd, monthsToClearAmountToZero),
    expectedCushionRestoredDate:
      monthsToRestoreCushion === null
        ? null
        : monthEndAfter(input.planMonthEnd, monthsToRestoreCushion),
  };
}

function buildSubscriptionCandidates(facts: FactInput[]) {
  return facts
    .filter((fact) => fact.type === "subscription")
    .map((fact): RecurringPlanCandidate => {
      const monthly = numberValue(fact, "monthlyCostMinor");
      return {
        actionId: `review-subscription-${stableSlug(stringValue(fact, "service") ?? fact.id)}`,
        kind: "subscription",
        title: `Review whether to keep ${fact.label}`,
        reason:
          "The charge is recurring, but its use and value are unknown until the user decides.",
        monthlyReductionMinor: monthly,
        annualisedReductionMinor: numberValue(fact, "annualisedCostMinor"),
        nextExpectedChargeDate: stringValue(fact, "nextExpectedChargeDate"),
        categoryDerivation: null,
        savingsRedirectDerivation: null,
        chargesObserved: numberValue(fact, "chargesObserved"),
        observationHistory: stringArray(fact, "observationDates"),
        evidenceIds: fact.evidenceIds,
        confidence: fact.confidence,
        usageKnown: false,
        userConfirmationRequired: true,
        countsAgainstSpendingChangeCap: true,
        selectionRank: 0,
        selected: false,
        selectedValueMinor: 0,
        exclusionReasonCode:
          fact.confidence === "high" ? null : "insufficient_recurrence",
        exclusionExplanation:
          fact.confidence === "high"
            ? null
            : "Only one charge has been observed, so there is not enough history to treat this as a confirmed monthly saving.",
      };
    });
}

function buildCategoryCandidates(
  facts: FactInput[],
  categories: CfoCategory[],
) {
  const allowedSlugs = new Set([
    "groceries",
    "eating-out",
    "coffee",
    "leisure",
  ]);
  const categoriesBySlug = new Map(
    categories.map((category) => [category.slug, category]),
  );
  return facts.flatMap((fact): RecurringPlanCandidate[] => {
    const categorySlug = fact.id.replace(/^category\./, "");
    const category = categoriesBySlug.get(categorySlug);
    if (
      !category ||
      !allowedSlugs.has(categorySlug) ||
      category.flexibility === "protected" ||
      fact.confidence === "limited"
    ) {
      return [];
    }
    const baselineMonthTotalsMinor = numberArray(
      fact,
      "baselineMonthTotalsMinor",
    );
    if (
      baselineMonthTotalsMinor.length !== 3 ||
      baselineMonthTotalsMinor.some((amount) => amount <= 0)
    ) {
      return [];
    }
    const derivation: CategoryTrimDerivation = {
      categorySlug,
      baselineMonthTotalsMinor,
      combinedBaselineTotalMinor: numberValue(
        fact,
        "combinedBaselineTotalMinor",
      ),
      fullMonthTypicalSpendMinor: numberValue(
        fact,
        "fullMonthTypicalSpendMinor",
      ),
      sameDayComparableSpendMinor: numberValue(
        fact,
        "sameDayComparableSpendMinor",
      ),
      currentMonthToDateSpendMinor: numberValue(
        fact,
        "currentMonthToDateSpendMinor",
      ),
      projectedCurrentMonthSpendMinor: numberValue(
        fact,
        "projectedCurrentMonthSpendMinor",
      ),
      flexibleShareBasisPoints: numberValue(fact, "flexibleShareBasisPoints"),
      initialFlexibleAmountMinor: numberValue(
        fact,
        "initialFlexibleAmountMinor",
      ),
      protectedMonthlyFloorMinor: numberValue(
        fact,
        "protectedMonthlyFloorMinor",
      ),
      amountAboveProtectedFloorMinor: numberValue(
        fact,
        "amountAboveProtectedFloorMinor",
      ),
      maximumReducibleMonthlyAmountMinor: numberValue(
        fact,
        "maximumReducibleMonthlyAmountMinor",
      ),
      selectedMonthlyReductionMinor: 0,
    };
    if (derivation.maximumReducibleMonthlyAmountMinor <= 0) return [];
    return [
      {
        actionId: `trim-category-${categorySlug}`,
        kind: "category_trim",
        title: `Reduce the flexible part of ${fact.label.toLowerCase()}`,
        reason:
          "The reduction is capped at the supported flexible portion of one arithmetic-mean month and preserves the protected monthly floor.",
        monthlyReductionMinor: derivation.maximumReducibleMonthlyAmountMinor,
        annualisedReductionMinor:
          derivation.maximumReducibleMonthlyAmountMinor * 12,
        nextExpectedChargeDate: null,
        categoryDerivation: derivation,
        savingsRedirectDerivation: null,
        chargesObserved: null,
        observationHistory: [],
        evidenceIds: fact.evidenceIds,
        confidence: fact.confidence,
        usageKnown: null,
        userConfirmationRequired: true,
        countsAgainstSpendingChangeCap: true,
        selectionRank: 0,
        selected: false,
        selectedValueMinor: 0,
        exclusionReasonCode: null,
        exclusionExplanation: null,
      },
    ];
  });
}

function buildSavingsRedirectCandidate(input: {
  source: SavingsRedirectionSource;
  irregularCostRequirementMinor: number;
}): RecurringPlanCandidate {
  const currentSavingsTransferMinor = input.source.allocations.reduce(
    (sum, allocation) => sum + allocation.monthlyContributionMinor,
    0,
  );
  const redirectedToIrregularCostsMinor = Math.min(
    currentSavingsTransferMinor,
    input.irregularCostRequirementMinor,
  );
  const remainingAfterIrregularCostsMinor = Math.max(
    0,
    currentSavingsTransferMinor - redirectedToIrregularCostsMinor,
  );
  const newlyRequiredForIrregularCostsMinor = Math.max(
    0,
    input.irregularCostRequirementMinor - redirectedToIrregularCostsMinor,
  );
  const inaccessible =
    !input.source.accountOwned ||
    input.source.accountProtected ||
    input.source.accountRole !== "savings";
  const evidenceIds = [
    ...input.source.allocations.flatMap((allocation) => allocation.evidenceIds),
    ...input.source.transferEvidenceIds,
    "calculation:savings-redirection",
  ];
  return {
    actionId: "redirect-recurring-savings-during-overdraft-cycle",
    kind: "savings_redirect",
    title:
      "Temporarily redirect the existing monthly savings transfer while the overdraft cycle persists",
    reason:
      "Give money that already leaves the account a temporary, more urgent job while required debt payments stay protected.",
    monthlyReductionMinor: 0,
    annualisedReductionMinor: 0,
    nextExpectedChargeDate: null,
    categoryDerivation: null,
    savingsRedirectDerivation: {
      currentSavingsTransferMinor,
      currentDestinationAccountId: input.source.accountId,
      currentDestinationAccountRole: input.source.accountRole,
      currentDestinationPurpose: input.source.accountPurpose,
      currentPurposeNames: input.source.allocations.map(
        (allocation) => allocation.name,
      ),
      proposedTemporaryPurpose:
        "Fund the monthly surprise-cost pot before creating new headroom.",
      redirectedToIrregularCostsMinor,
      remainingAfterIrregularCostsMinor,
      newlyRequiredForIrregularCostsMinor,
      formerPurposeOutgoingsChangeMinor: -currentSavingsTransferMinor,
      irregularCostOutgoingsChangeMinor: redirectedToIrregularCostsMinor,
      netOutgoingsChangeAgainstExistingFlowMinor:
        newlyRequiredForIrregularCostsMinor - remainingAfterIrregularCostsMinor,
      netOutgoingsChangeAgainstFullyFundedPlanMinor:
        -currentSavingsTransferMinor,
      userConfirmationRequired: true,
      resumeCondition:
        "Reconsider ordinary saving after a complete healthy cycle, and resume it only if the surprise-cost pot remains funded and every required debt payment stays protected.",
      reconciliationHolds:
        currentSavingsTransferMinor ===
        redirectedToIrregularCostsMinor + remainingAfterIrregularCostsMinor,
    },
    chargesObserved: null,
    observationHistory: [],
    evidenceIds: [...new Set(evidenceIds)],
    confidence: inaccessible ? "limited" : "medium",
    usageKnown: null,
    userConfirmationRequired: true,
    countsAgainstSpendingChangeCap: false,
    selectionRank: 0,
    selected: false,
    selectedValueMinor: 0,
    exclusionReasonCode: inaccessible ? "protected_or_inaccessible" : null,
    exclusionExplanation: inaccessible
      ? "The destination is protected, inaccessible, or not an owned savings account, so the transfer cannot be included in the proposed plan."
      : null,
  };
}

export function selectRecurringPlanCandidates(
  candidates: RecurringPlanCandidate[],
  maximumSpendingChanges = 5,
) {
  const ranked = [...candidates]
    .sort(
      (left, right) =>
        Number(left.countsAgainstSpendingChangeCap) -
          Number(right.countsAgainstSpendingChangeCap) ||
        Number(Boolean(left.exclusionReasonCode)) -
          Number(Boolean(right.exclusionReasonCode)) ||
        right.monthlyReductionMinor - left.monthlyReductionMinor ||
        left.actionId.localeCompare(right.actionId),
    )
    .map((candidate, index) => ({ ...candidate, selectionRank: index + 1 }));
  let selectedSpendingChangeCount = 0;
  return ranked.map((candidate): RecurringPlanCandidate => {
    if (candidate.exclusionReasonCode) return candidate;
    if (
      candidate.kind !== "savings_redirect" &&
      candidate.monthlyReductionMinor <= 0
    ) {
      return {
        ...candidate,
        exclusionReasonCode: "no_supported_value",
        exclusionExplanation:
          "The deterministic evidence does not support a positive monthly value.",
      };
    }
    if (
      candidate.countsAgainstSpendingChangeCap &&
      selectedSpendingChangeCount >= maximumSpendingChanges
    ) {
      return {
        ...candidate,
        exclusionReasonCode: "maximum_item_limit",
        exclusionExplanation:
          "Five otherwise eligible spending changes with higher supported monthly values already fill the spending-change limit.",
      };
    }
    if (candidate.countsAgainstSpendingChangeCap) {
      selectedSpendingChangeCount += 1;
    }
    const selectedValueMinor =
      candidate.kind === "savings_redirect"
        ? (candidate.savingsRedirectDerivation?.currentSavingsTransferMinor ??
          0)
        : candidate.monthlyReductionMinor;
    return {
      ...candidate,
      selected: true,
      selectedValueMinor,
      categoryDerivation: candidate.categoryDerivation
        ? {
            ...candidate.categoryDerivation,
            selectedMonthlyReductionMinor: candidate.monthlyReductionMinor,
          }
        : null,
      exclusionReasonCode: null,
      exclusionExplanation: null,
    };
  });
}

function normalisedVariableSpending(input: {
  categoryFacts: FactInput[];
  categories: CfoCategory[];
  excludedCategorySlugs: string[];
}) {
  const excluded = new Set([
    ...input.excludedCategorySlugs,
    "subscriptions",
    "unexpected-costs",
  ]);
  const categories = new Map(
    input.categories.map((category) => [category.slug, category]),
  );
  let essentialMinor = 0;
  let flexibleMinor = 0;
  for (const fact of input.categoryFacts) {
    const slug = fact.id.replace(/^category\./, "");
    const category = categories.get(slug);
    if (!category || excluded.has(slug)) continue;
    const typical = numberValue(fact, "fullMonthTypicalSpendMinor");
    if (typical <= 0 || fact.confidence === "limited") continue;
    const protectedFloor = numberValue(fact, "protectedMonthlyFloorMinor");
    essentialMinor += protectedFloor;
    flexibleMinor += Math.max(0, typical - protectedFloor);
  }
  return { essentialMinor, flexibleMinor };
}

function buildMilestones(input: {
  planMonthEnd: string;
  backlog: RecoveryBacklog;
  remainingRecurringGapMinor: number;
  evidenceIds: string[];
  scheduledEventDates: string[];
  promotionalRateExpiryDates: string[];
}): RecoveryPlanMilestone[] {
  const assumptions = [
    "If these changes hold for each complete month.",
    "Income and monthly outgoings remain unchanged.",
    `The seeded salary and commitment timing pattern repeats from these dated events: ${input.scheduledEventDates.join(", ")}.`,
    ...(input.promotionalRateExpiryDates.length
      ? [
          `Recorded promotional-rate expiries remain in force: ${input.promotionalRateExpiryDates.join(", ")}.`,
        ]
      : []),
    "No new borrowing or unplanned spending is added.",
    "A month-by-month forward schedule is used only when the plan leaves a positive amount after all monthly needs.",
  ];
  const noCapacityLimitation =
    input.remainingRecurringGapMinor > 0
      ? "The selected plan leaves a recurring monthly shortfall, so it creates no supported backlog-reduction capacity."
      : "No positive monthly backlog-reduction capacity is available.";
  const zeroDate =
    input.backlog.monthsToClearAmountToZero === null
      ? null
      : monthEndAfter(
          input.planMonthEnd,
          input.backlog.monthsToClearAmountToZero,
        );
  const cushionDate =
    input.backlog.monthsToRestoreCushion === null
      ? null
      : monthEndAfter(input.planMonthEnd, input.backlog.monthsToRestoreCushion);
  const healthyDate = cushionDate ? monthEndAfter(cushionDate, 1) : null;
  const optionalOverpaymentDate = healthyDate
    ? monthEndAfter(healthyDate, 1)
    : null;
  const common = {
    monthlyBacklogReductionMinor: input.backlog.monthlyReductionCapacityMinor,
    additionalMonthlyImprovementRequiredMinor: input.remainingRecurringGapMinor,
    assumptions,
    evidenceIds: input.evidenceIds,
  };
  return [
    {
      id: "finish_above_zero",
      title: "First month the carried amount to zero is cleared",
      estimatedDate: zeroDate,
      remainingBacklogForMilestoneMinor:
        input.backlog.remainingAmountToZeroMinor,
      ...common,
      confidence: zeroDate ? "limited" : "limited",
      limitation: zeroDate
        ? "This month-by-month date assumes the seeded salary and commitment timing continues."
        : noCapacityLimitation,
    },
    {
      id: "restore_cushion",
      title: "First month the safety cushion is restored",
      estimatedDate: cushionDate,
      remainingBacklogForMilestoneMinor: input.backlog.remainingBacklogMinor,
      ...common,
      confidence: "limited",
      limitation: cushionDate
        ? "This month-by-month date assumes the seeded salary and commitment timing continues."
        : noCapacityLimitation,
    },
    {
      id: "healthy_cycle",
      title: "First complete healthy cycle without later-income repair",
      estimatedDate: healthyDate,
      remainingBacklogForMilestoneMinor: input.backlog.remainingBacklogMinor,
      ...common,
      confidence: "limited",
      limitation: healthyDate
        ? "This is the first complete calendar month after the cushion is restored, assuming the seeded salary and commitment pattern repeats."
        : noCapacityLimitation,
    },
    {
      id: "savings_redirect_review",
      title: "First month to review the temporary savings redirect",
      estimatedDate: healthyDate,
      remainingBacklogForMilestoneMinor: input.backlog.remainingBacklogMinor,
      ...common,
      confidence: "limited",
      limitation: healthyDate
        ? "Ordinary saving does not resume automatically: the surprise-cost pot must remain funded and every required debt payment must stay protected."
        : noCapacityLimitation,
    },
    {
      id: "safe_optional_overpayment",
      title: "First month a safe optional debt overpayment can begin",
      estimatedDate: optionalOverpaymentDate,
      remainingBacklogForMilestoneMinor: input.backlog.remainingBacklogMinor,
      ...common,
      confidence: "limited",
      limitation: optionalOverpaymentDate
        ? "This starts only after the complete healthy-cycle month and assumes the temporary redirect remains in place; it cannot also be treated as resumed ordinary saving."
        : noCapacityLimitation,
    },
  ];
}

export function buildBreakCycleRecoveryPlan(input: {
  forecast: CashForecast;
  immediatePlan: RecoveryPlan;
  categories: CfoCategory[];
  categoryFacts: FactInput[];
  subscriptionFacts: FactInput[];
  unexpectedCostFact: FactInput | undefined;
  normalisedMonthlyIncomeMinor: number;
  normalisedProtectedCostsMinor: number;
  normalisedDebtMinimumsMinor: number;
  otherRecurringFundedAllocationsMinor: number;
  savingsRedirectionSource: SavingsRedirectionSource;
  debts: DebtProjectionDebt[];
  excludedCategorySlugs: string[];
}): BreakCycleRecoveryPlan {
  const unexpected = input.unexpectedCostFact;
  const suggestedIrregularMinor = unexpected
    ? numberValue(unexpected, "suggestedSinkingFundMinor")
    : 0;
  const currentIrregularContributionMinor = unexpected
    ? numberValue(unexpected, "currentSinkingFundContributionMinor")
    : 0;
  const irregularFundingGapMinor = unexpected
    ? numberValue(unexpected, "fundingGapMinor")
    : 0;
  const irregularCostAllocation: IrregularCostAllocation = {
    monthlyAllocationMinor: suggestedIrregularMinor,
    basis: "three_month_average",
    historicalMonths: unexpected ? stringArray(unexpected, "months") : [],
    historicalCostsMinor: unexpected
      ? numberArray(unexpected, "costsMinor")
      : [],
    currentContributionMinor: currentIrregularContributionMinor,
    fundingGapMinor: irregularFundingGapMinor,
    evidenceIds: unexpected?.evidenceIds ?? ["calculation:unexpected-costs"],
    limitation:
      "Three complete comparison months support a cautious provision, not a long-term guarantee.",
  };
  const variableSpending = normalisedVariableSpending({
    categoryFacts: input.categoryFacts,
    categories: input.categories,
    excludedCategorySlugs: input.excludedCategorySlugs,
  });
  const subscriptionSummary = input.subscriptionFacts.find(
    (fact) => fact.type === "subscription_summary",
  );
  const expectedSubscriptionsMinor = subscriptionSummary
    ? numberValue(subscriptionSummary, "monthlyCostMinor")
    : 0;
  const normalisedOutgoingsBeforeNewProvisionMinor =
    input.normalisedProtectedCostsMinor +
    input.normalisedDebtMinimumsMinor +
    variableSpending.essentialMinor +
    variableSpending.flexibleMinor +
    expectedSubscriptionsMinor +
    input.otherRecurringFundedAllocationsMinor;
  const totalNormalisedMonthlyOutgoingsMinor =
    normalisedOutgoingsBeforeNewProvisionMinor + irregularFundingGapMinor;
  const surplusOrDeficitBeforePlanMinor =
    input.normalisedMonthlyIncomeMinor -
    normalisedOutgoingsBeforeNewProvisionMinor;
  const recurringGapBeforePlanMinor = Math.max(
    0,
    -surplusOrDeficitBeforePlanMinor,
  );
  const recurringSurplusBeforePlanMinor = Math.max(
    0,
    surplusOrDeficitBeforePlanMinor,
  );
  const requiredImprovementForHealthyCycleMinor = Math.max(
    0,
    totalNormalisedMonthlyOutgoingsMinor - input.normalisedMonthlyIncomeMinor,
  );
  const recurringFlow: RecurringFlowPlan = {
    normalisedMonthlyIncomeMinor: input.normalisedMonthlyIncomeMinor,
    normalisedProtectedCostsMinor: input.normalisedProtectedCostsMinor,
    normalisedDebtMinimumsMinor: input.normalisedDebtMinimumsMinor,
    normalisedEssentialSpendingMinor: variableSpending.essentialMinor,
    normalisedFlexibleSpendingMinor: variableSpending.flexibleMinor,
    expectedSubscriptionsMinor,
    otherRecurringFundedAllocationsMinor:
      input.otherRecurringFundedAllocationsMinor,
    normalisedOutgoingsBeforeNewProvisionMinor,
    irregularCostProvisionMinor: irregularFundingGapMinor,
    totalNormalisedMonthlyOutgoingsMinor,
    existingRecurringGapBeforeIrregularCostsMinor: recurringGapBeforePlanMinor,
    fullyFundedRecurringGapBeforePlanMinor:
      requiredImprovementForHealthyCycleMinor,
    surplusOrDeficitBeforePlanMinor,
    recurringGapBeforePlanMinor,
    recurringSurplusBeforePlanMinor,
    requiredImprovementToBreakEvenMinor: recurringGapBeforePlanMinor,
    requiredImprovementForHealthyCycleMinor,
    assumptions: [
      "Confirmed monthly income is treated as the repeatable income cycle.",
      "Confirmed monthly commitments and contractual debt minimums are included once.",
      "Variable spending uses arithmetic means from three complete months; protected floors and flexible shares sum to each monthly mean.",
      "Expected subscriptions are included once and excluded from variable category spending.",
      "The irregular-cost provision is not in the pre-plan outgoings and is funded once by the new plan.",
      "The safety cushion and current timing backlog are balance targets, not monthly expenses.",
    ],
    evidenceIds: [
      "calculation:normalised-monthly-cycle",
      "calculation:category-comparison",
      "calculation:subscriptions",
      "calculation:unexpected-costs",
    ],
  };
  const subscriptionCandidates = buildSubscriptionCandidates(
    input.subscriptionFacts,
  );
  const categoryCandidates = buildCategoryCandidates(
    input.categoryFacts,
    input.categories,
  );
  const redirectCandidate = buildSavingsRedirectCandidate({
    source: input.savingsRedirectionSource,
    irregularCostRequirementMinor: irregularFundingGapMinor,
  });
  if (
    redirectCandidate.savingsRedirectDerivation?.currentSavingsTransferMinor !==
    input.otherRecurringFundedAllocationsMinor
  ) {
    throw new Error(
      "The recurring savings source does not reconcile to the funded-allocation total.",
    );
  }
  const candidates = selectRecurringPlanCandidates([
    redirectCandidate,
    ...subscriptionCandidates,
    ...categoryCandidates,
  ]);
  const selectedActions = candidates.filter((candidate) => candidate.selected);
  const redirectActionsSelectedCount = selectedActions.filter(
    (candidate) => !candidate.countsAgainstSpendingChangeCap,
  ).length;
  const spendingChangeActionsSelectedCount = selectedActions.filter(
    (candidate) => candidate.countsAgainstSpendingChangeCap,
  ).length;
  const selectedRedirect = selectedActions.find(
    (candidate) => candidate.kind === "savings_redirect",
  )?.savingsRedirectDerivation;
  const grossMonthlySavingsMinor = selectedActions.reduce(
    (sum, candidate) => sum + candidate.monthlyReductionMinor,
    0,
  );
  const redirectedExistingAllocationMinor =
    selectedRedirect?.currentSavingsTransferMinor ?? 0;
  const redirectedToIrregularCostsMinor =
    selectedRedirect?.redirectedToIrregularCostsMinor ?? 0;
  const redirectRemainingAfterIrregularCostsMinor =
    selectedRedirect?.remainingAfterIrregularCostsMinor ?? 0;
  const genuinelyNewIrregularCostRequirementMinor = Math.max(
    0,
    irregularFundingGapMinor - redirectedToIrregularCostsMinor,
  );
  const recurringOutcome = calculateRecurringPlanOutcome({
    surplusOrDeficitBeforePlanMinor,
    recurringGapBeforePlanMinor: requiredImprovementForHealthyCycleMinor,
    grossMonthlySavingsMinor,
    newlyFundedAllocationsMinor: genuinelyNewIrregularCostRequirementMinor,
    redirectedToIrregularCostsMinor,
    redirectRemainingAfterIrregularCostsMinor,
  });
  const {
    netMonthlyImprovementMinor,
    balanceAfterPlanMinor,
    remainingRecurringGapMinor,
    recurringCoverageBasisPoints,
    monthlyBacklogReductionMinor,
  } = recurringOutcome;
  const recurringActions: RecurringActionsPlan = {
    candidates,
    selectedActions,
    redirectActionsSelectedCount,
    spendingChangeActionsSelectedCount,
    totalDisplayedPlanLines: selectedActions.length,
    maximumSpendingChangeActions: 5,
    grossMonthlySavingsMinor,
    grossMonthlyReductionsMinor: grossMonthlySavingsMinor,
    redirectedExistingAllocationMinor,
    redirectedToIrregularCostsMinor,
    redirectRemainingAfterIrregularCostsMinor,
    newlyFundedAllocationsMinor: genuinelyNewIrregularCostRequirementMinor,
    correctedOutgoingsBeforeReductionsMinor:
      normalisedOutgoingsBeforeNewProvisionMinor +
      genuinelyNewIrregularCostRequirementMinor -
      redirectRemainingAfterIrregularCostsMinor,
    correctedRecurringGapBeforeReductionsMinor: Math.max(
      0,
      normalisedOutgoingsBeforeNewProvisionMinor +
        genuinelyNewIrregularCostRequirementMinor -
        redirectRemainingAfterIrregularCostsMinor -
        input.normalisedMonthlyIncomeMinor,
    ),
    totalMonthlyOutgoingsAfterPlanMinor:
      normalisedOutgoingsBeforeNewProvisionMinor +
      genuinelyNewIrregularCostRequirementMinor -
      redirectRemainingAfterIrregularCostsMinor -
      grossMonthlySavingsMinor,
    netMonthlyImprovementMinor,
    remainingRecurringGapMinor,
    recurringCoverageBasisPoints,
    structurallyBalanced: balanceAfterPlanMinor >= 0,
    balanceAfterPlanMinor,
    status:
      balanceAfterPlanMinor >= 0
        ? "structurally_balanced"
        : "recurring_shortfall",
  };
  const backlog = calculateBacklogSchedule({
    amountToZeroMinor: input.forecast.amountNeededToAvoidOverdraftMinor,
    cushionToRebuildMinor: input.forecast.safetyCushionMinor,
    immediateReductionMinor: input.immediatePlan.totalImprovementMinor,
    monthlyReductionCapacityMinor: monthlyBacklogReductionMinor,
    planMonthEnd: input.forecast.monthEndDate,
  });
  const evidenceIds = [
    "calculation:normalised-monthly-cycle",
    "calculation:dated-cash-forecast",
    "calculation:category-comparison",
    "calculation:subscriptions",
    "calculation:unexpected-costs",
  ];
  const milestonesUnderPlan = buildMilestones({
    planMonthEnd: input.forecast.monthEndDate,
    backlog,
    remainingRecurringGapMinor,
    evidenceIds,
    scheduledEventDates: input.forecast.events.map(
      (event) => `${event.kind}:${event.date}`,
    ),
    promotionalRateExpiryDates: input.debts.flatMap((debt) =>
      debt.promotionalEndDate ? [debt.promotionalEndDate] : [],
    ),
  });
  const optionalOverpaymentMilestone = milestonesUnderPlan.find(
    (milestone) => milestone.id === "safe_optional_overpayment",
  );
  const safeOptionalPaymentMinor = optionalOverpaymentMilestone?.estimatedDate
    ? backlog.monthlyReductionCapacityMinor
    : 0;
  const delayedDebtProjection = safeOptionalPaymentMinor
    ? projectDebtPayoff({
        debts: input.debts,
        asOfDate: input.forecast.asOfDate,
        monthlyExtraPaymentMinor: safeOptionalPaymentMinor,
        extraPaymentStartDate: optionalOverpaymentMilestone!.estimatedDate,
      })
    : null;
  const currentDebtProjection = projectDebtPayoff({
    debts: input.debts,
    asOfDate: input.forecast.asOfDate,
    monthlyExtraPaymentMinor: 0,
  });
  const assumptions = [
    ...recurringFlow.assumptions,
    "Moving the existing savings balance is immediate timing support and remains separate from redirecting future monthly savings contributions.",
    "The recurring savings redirect is temporary, requires user confirmation, and changes the purpose of existing outgoings rather than inventing income.",
    "Selected category reductions never exceed one typical month's supported flexible share or cross the protected monthly floor.",
    "Every selected subscription change requires the user to confirm that the service is no longer worth keeping.",
    "Only a positive monthly balance after the recurring plan can reduce the one-off backlog.",
    "Required debt payments remain protected; optional debt projections begin only after the first complete healthy cycle.",
  ];
  return {
    immediatePlan: input.immediatePlan,
    recurringFlow,
    recurringActions,
    irregularCostAllocation,
    backlog,
    milestonesUnderPlan,
    debtEffect: {
      safeOptionalPaymentMinor,
      optionalOverpaymentStartDate:
        optionalOverpaymentMilestone?.estimatedDate ?? null,
      revisedDebtFreeDate: delayedDebtProjection?.payoffDate ?? null,
      currentDebtFreeDate: currentDebtProjection.payoffDate,
      limitation: optionalOverpaymentMilestone?.estimatedDate
        ? "The optional payment is supported only while the selected changes and temporary redirect continue, after the complete healthy cycle, with no new borrowing or unplanned expenses."
        : "No positive monthly amount is available after the healthy-cycle condition, so no optional overpayment or revised debt-free date is supported.",
    },
    userDecisionsRequired: selectedActions.map((candidate) => {
      if (candidate.kind === "savings_redirect") {
        return "Confirm that the savings are accessible, unrestricted, not needed for an essential purpose, and may be redirected temporarily.";
      }
      return candidate.kind === "subscription"
        ? `Decide whether ${candidate.title.replace(/^Review whether to keep /, "")} is worth keeping.`
        : `Confirm whether the proposed ${candidate.title.replace(/^Reduce the flexible part of /, "")} change is workable for the household.`;
    }),
    assumptions,
    evidenceIds,
  };
}
