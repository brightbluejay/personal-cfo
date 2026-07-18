import type { SpendingBaseline } from "./baseline";
import type { CfoCategory } from "./types";

export interface RecoveryAction {
  id: string;
  kind: "savings_transfer" | "spending_reduction";
  title: string;
  explanation: string;
  improvementMinor: number;
  categorySlugs: string[];
}

export interface RecoveryPlan {
  targetMinor: number;
  accessibleCashIncreaseMinor: number;
  spendingReductionMinor: number;
  totalImprovementMinor: number;
  remainingGapMinor: number;
  actions: RecoveryAction[];
}

export function buildRecoveryPlan(input: {
  amountNeededToRestoreSafetyCushionMinor: number;
  amountNeededToAvoidOverdraftMinor: number;
  reservedSavingsMinor: number;
  baseline: SpendingBaseline[];
  categories: CfoCategory[];
}): RecoveryPlan {
  const targetMinor = Math.max(
    0,
    input.amountNeededToRestoreSafetyCushionMinor,
  );
  const categoriesBySlug = new Map(
    input.categories.map((category) => [category.slug, category]),
  );
  const reducible = input.baseline
    .filter((item) => item.projectedRemainingMinor > 0)
    .filter(
      (item) =>
        categoriesBySlug.get(item.categorySlug)?.flexibility !== "protected",
    )
    .sort(
      (left, right) =>
        right.projectedRemainingMinor - left.projectedRemainingMinor,
    );
  const spendingReductionMinor = reducible.reduce(
    (sum, item) => sum + item.projectedRemainingMinor,
    0,
  );
  const accessibleCashIncreaseMinor = Math.min(
    input.reservedSavingsMinor,
    input.amountNeededToAvoidOverdraftMinor,
  );
  const actions: RecoveryAction[] = [];
  if (accessibleCashIncreaseMinor > 0) {
    actions.push({
      id: "use-savings-for-timing-gap",
      kind: "savings_transfer",
      title: "Consider moving savings before the bills are due",
      explanation:
        "This reduces the temporary overdraft, but the money would no longer be held separately as savings.",
      improvementMinor: accessibleCashIncreaseMinor,
      categorySlugs: [],
    });
  }
  if (spendingReductionMinor > 0) {
    actions.push({
      id: "reduce-remaining-flexible-spending",
      kind: "spending_reduction",
      title: "Pause the flexible spending still expected this month",
      explanation:
        "This affects only spending that has not happened yet. Past purchases are not treated as recoverable cash.",
      improvementMinor: spendingReductionMinor,
      categorySlugs: reducible.map((item) => item.categorySlug),
    });
  }
  const totalImprovementMinor =
    accessibleCashIncreaseMinor + spendingReductionMinor;
  return {
    targetMinor,
    accessibleCashIncreaseMinor,
    spendingReductionMinor,
    totalImprovementMinor,
    remainingGapMinor: Math.max(0, targetMinor - totalImprovementMinor),
    actions: actions.slice(0, 2),
  };
}
