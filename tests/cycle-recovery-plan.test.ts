import BetterSqlite3 from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getCfoWorkspace } from "../src/db/cfo-query";
import * as schema from "../src/db/schema";
import { seedDatabase } from "../src/db/seed";
import {
  calculateBacklogSchedule,
  calculateCategoryTrimDerivation,
  calculateRecurringPlanOutcome,
  selectRecurringPlanCandidates,
} from "../src/domain/cfo/cycle-recovery-plan";

const databaseRelativePath = "./data/cycle-recovery-plan-test.db";
const databasePath = path.resolve(process.cwd(), databaseRelativePath);

beforeAll(() => {
  process.env.DATABASE_URL = `file:${databaseRelativePath}`;
  const sqlite = new BetterSqlite3(databasePath);
  sqlite.pragma("foreign_keys = ON");
  const db = drizzle(sqlite, { schema });
  migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
  seedDatabase(db, path.resolve(process.cwd(), "data"));
  sqlite.close();
});

afterAll(() => {
  delete process.env.DATABASE_URL;
  for (const candidate of [
    databasePath,
    `${databasePath}-wal`,
    `${databasePath}-shm`,
  ]) {
    if (existsSync(candidate)) rmSync(candidate);
  }
});

describe("monthly category trim derivation", () => {
  it("uses the arithmetic mean of complete months rather than their aggregate", () => {
    const result = calculateCategoryTrimDerivation({
      categorySlug: "example",
      baselineMonthTotalsMinor: [60_000, 70_000, 80_000],
      sameDayComparableSpendMinor: 30_000,
      currentMonthToDateSpendMinor: 50_000,
      projectedCurrentMonthSpendMinor: 90_000,
      flexibleShareBasisPoints: 2_000,
      selectedMonthlyReductionMinor: 42_000,
    });

    expect(result.combinedBaselineTotalMinor).toBe(210_000);
    expect(result.fullMonthTypicalSpendMinor).toBe(70_000);
    expect(result.initialFlexibleAmountMinor).toBe(14_000);
    expect(result.protectedMonthlyFloorMinor).toBe(56_000);
    expect(result.maximumReducibleMonthlyAmountMinor).toBe(14_000);
    expect(result.selectedMonthlyReductionMinor).toBe(14_000);
  });

  it("does not substitute the same-day comparison for the full-month plan value", () => {
    const result = calculateCategoryTrimDerivation({
      categorySlug: "example",
      baselineMonthTotalsMinor: [60_000, 70_000, 80_000],
      sameDayComparableSpendMinor: 9_000,
      currentMonthToDateSpendMinor: 20_000,
      projectedCurrentMonthSpendMinor: 90_000,
      flexibleShareBasisPoints: 2_000,
    });

    expect(result.sameDayComparableSpendMinor).toBe(9_000);
    expect(result.fullMonthTypicalSpendMinor).toBe(70_000);
    expect(
      result.protectedMonthlyFloorMinor + result.initialFlexibleAmountMinor,
    ).toBe(result.fullMonthTypicalSpendMinor);
  });

  it("reconciles seeded selected trims to explicit monthly facts and floors", () => {
    const plan = getCfoWorkspace()!.breakCyclePlan;
    const selectedCategories = plan.recurringActions.selectedActions.filter(
      (action) => action.categoryDerivation,
    );

    expect(
      selectedCategories.map((action) => [
        action.categoryDerivation!.categorySlug,
        action.monthlyReductionMinor,
      ]),
    ).toEqual([
      ["groceries", 14_580],
      ["eating-out", 4_988],
      ["leisure", 1_483],
      ["coffee", 1_416],
    ]);
    for (const action of selectedCategories) {
      const derivation = action.categoryDerivation!;
      expect(action.monthlyReductionMinor).toBe(
        derivation.maximumReducibleMonthlyAmountMinor,
      );
      expect(
        derivation.protectedMonthlyFloorMinor +
          derivation.initialFlexibleAmountMinor,
      ).toBe(derivation.fullMonthTypicalSpendMinor);
      expect(action.monthlyReductionMinor).toBeLessThanOrEqual(
        derivation.initialFlexibleAmountMinor,
      );
    }
  });
});

describe("recurring flow and one-off backlog", () => {
  it("does not turn a temporary pre-income low into a recurring monthly gap", () => {
    const workspace = getCfoWorkspace()!;
    const plan = workspace.breakCyclePlan;

    expect(workspace.forecast.projectedMonthEndBalanceMinor).toBeGreaterThan(0);
    expect(plan.backlog.amountToZeroMinor).toBe(134_800);
    expect(plan.recurringFlow.recurringGapBeforePlanMinor).toBe(15_220);
    expect(plan.recurringFlow.recurringGapBeforePlanMinor).not.toBe(
      plan.backlog.amountToZeroMinor,
    );
    expect(plan.backlog.cushionToRebuildMinor).toBe(25_000);
    expect(plan.backlog.totalBacklogMinor).toBe(159_800);
  });

  it("redirects the existing savings contributions without counting them twice", () => {
    const plan = getCfoWorkspace()!.breakCyclePlan;
    const redirect = plan.recurringActions.candidates.find(
      (candidate) => candidate.kind === "savings_redirect",
    )!;

    expect(plan.recurringFlow.totalNormalisedMonthlyOutgoingsMinor).toBe(
      plan.recurringFlow.normalisedOutgoingsBeforeNewProvisionMinor + 20_500,
    );
    expect(plan.recurringFlow.fullyFundedRecurringGapBeforePlanMinor).toBe(
      35_720,
    );
    expect(redirect.selected).toBe(true);
    expect(redirect.userConfirmationRequired).toBe(true);
    expect(redirect.countsAgainstSpendingChangeCap).toBe(false);
    expect(redirect.savingsRedirectDerivation).toMatchObject({
      currentSavingsTransferMinor: 20_000,
      redirectedToIrregularCostsMinor: 20_000,
      remainingAfterIrregularCostsMinor: 0,
      newlyRequiredForIrregularCostsMinor: 500,
      reconciliationHolds: true,
    });
    expect(
      redirect.evidenceIds.filter((id) => id.startsWith("sinking-fund:")),
    ).toHaveLength(4);
    expect(
      redirect.evidenceIds.some((id) => id.startsWith("transaction:")),
    ).toBe(true);
    expect(plan.immediatePlan.accessibleCashIncreaseMinor).toBe(27_000);
    expect(plan.recurringActions.redirectActionsSelectedCount).toBe(1);
    expect(plan.recurringActions.spendingChangeActionsSelectedCount).toBe(5);
    expect(plan.recurringActions.totalDisplayedPlanLines).toBe(6);
    expect(plan.recurringActions.grossMonthlySavingsMinor).toBe(24_966);
    expect(plan.recurringActions.redirectedExistingAllocationMinor).toBe(
      20_000,
    );
    expect(plan.recurringActions.newlyFundedAllocationsMinor).toBe(500);
    expect(plan.recurringActions.netMonthlyImprovementMinor).toBe(24_466);
    expect(plan.recurringActions.balanceAfterPlanMinor).toBe(9_246);
    expect(
      plan.recurringActions.selectedActions.reduce(
        (sum, action) => sum + action.monthlyReductionMinor,
        0,
      ),
    ).toBe(plan.recurringActions.grossMonthlyReductionsMinor);
    expect(plan.recurringActions.structurallyBalanced).toBe(true);
    expect(redirect.savingsRedirectDerivation!.resumeCondition).toMatch(
      /complete healthy cycle.*surprise-cost pot.*required debt payment/i,
    );
  });

  it("keeps every unselected candidate visible with a typed reason", () => {
    const candidates =
      getCfoWorkspace()!.breakCyclePlan.recurringActions.candidates;
    for (const candidate of candidates.filter((item) => !item.selected)) {
      expect(candidate.exclusionReasonCode).not.toBeNull();
      expect(candidate.exclusionExplanation).toBeTruthy();
      expect(candidate.selectionRank).toBeGreaterThan(0);
    }
    for (const slug of ["coffee", "leisure", "eating-out"]) {
      const candidate = candidates.find(
        (item) => item.categoryDerivation?.categorySlug === slug,
      )!;
      expect(candidate.selected).toBe(true);
      expect(candidate.exclusionReasonCode).toBeNull();
      expect(candidate.monthlyReductionMinor).toBeGreaterThan(0);
    }
    const cloudy = candidates.find((item) =>
      item.actionId.includes("cloudy-digital"),
    )!;
    expect(cloudy.selected).toBe(false);
    expect(cloudy.exclusionReasonCode).toBe("maximum_item_limit");
    const eatingOut = candidates.find(
      (item) => item.categoryDerivation?.categorySlug === "eating-out",
    )!;
    expect(eatingOut.selectionRank).toBeLessThan(cloudy.selectionRank);
    expect(eatingOut.monthlyReductionMinor).toBeGreaterThan(
      cloudy.monthlyReductionMinor,
    );
    const streamHouse = candidates.find((item) =>
      item.actionId.includes("stream-house"),
    )!;
    expect(streamHouse.chargesObserved).toBe(1);
    expect(streamHouse.observationHistory).toHaveLength(1);
    expect(streamHouse.exclusionReasonCode).toBe("insufficient_recurrence");
  });

  it("uses a stable action ID tie-break after supported monthly value", () => {
    const seeded =
      getCfoWorkspace()!.breakCyclePlan.recurringActions.candidates;
    const cloudy = seeded.find((item) =>
      item.actionId.includes("cloudy-digital"),
    )!;
    const netflix = seeded.find((item) =>
      item.actionId.includes("netflix-com"),
    )!;
    const tied = [cloudy, netflix].map((candidate) => ({
      ...candidate,
      monthlyReductionMinor: 1_000,
      selected: false,
      selectedValueMinor: 0,
      exclusionReasonCode: null,
      exclusionExplanation: null,
    }));
    const first = selectRecurringPlanCandidates(tied, 1);
    const second = selectRecurringPlanCandidates([...tied].reverse(), 1);
    expect(first.map((item) => [item.actionId, item.selected])).toEqual(
      second.map((item) => [item.actionId, item.selected]),
    );
    expect(first.find((item) => item.selected)?.actionId).toContain(
      "cloudy-digital",
    );
  });

  it("allows a lower value to outrank only when the higher value has a typed eligibility exclusion", () => {
    const seeded =
      getCfoWorkspace()!.breakCyclePlan.recurringActions.candidates;
    const streamHouse = seeded.find((item) =>
      item.actionId.includes("stream-house"),
    )!;
    const cloudy = seeded.find((item) =>
      item.actionId.includes("cloudy-digital"),
    )!;
    const ranked = selectRecurringPlanCandidates(
      [
        { ...streamHouse, monthlyReductionMinor: 5_000 },
        {
          ...cloudy,
          selected: false,
          selectedValueMinor: 0,
          exclusionReasonCode: null,
          exclusionExplanation: null,
        },
      ],
      1,
    );
    expect(
      ranked.find((item) => item.actionId.includes("cloudy"))?.selected,
    ).toBe(true);
    expect(
      ranked.find((item) => item.actionId.includes("stream-house"))
        ?.exclusionReasonCode,
    ).toBe("insufficient_recurrence");
  });

  it("does not select a protected or inaccessible savings source", () => {
    const redirect =
      getCfoWorkspace()!.breakCyclePlan.recurringActions.candidates[0];
    const [protectedCandidate] = selectRecurringPlanCandidates([
      {
        ...redirect,
        selected: false,
        selectedValueMinor: 0,
        exclusionReasonCode: "protected_or_inaccessible",
        exclusionExplanation: "Protected in this scenario.",
      },
    ]);
    expect(protectedCandidate.selected).toBe(false);
    expect(protectedCandidate.exclusionReasonCode).toBe(
      "protected_or_inaccessible",
    );
  });

  it("does not count an existing monthly surplus twice", () => {
    const outcome = calculateRecurringPlanOutcome({
      surplusOrDeficitBeforePlanMinor: 10_000,
      recurringGapBeforePlanMinor: 0,
      grossMonthlySavingsMinor: 5_000,
      newlyFundedAllocationsMinor: 2_000,
    });

    expect(outcome.netMonthlyImprovementMinor).toBe(3_000);
    expect(outcome.balanceAfterPlanMinor).toBe(13_000);
    expect(outcome.monthlyBacklogReductionMinor).toBe(13_000);
  });

  it("uses ceiling dates only when monthly backlog reduction is positive", () => {
    const supported = calculateBacklogSchedule({
      amountToZeroMinor: 134_800,
      cushionToRebuildMinor: 25_000,
      immediateReductionMinor: 29_000,
      monthlyReductionCapacityMinor: 40_000,
      planMonthEnd: "2026-07-31",
    });
    expect(supported.monthsToClearAmountToZero).toBe(3);
    expect(supported.expectedAmountToZeroDate).toBe("2026-10-31");
    expect(supported.monthsToRestoreCushion).toBe(4);
    expect(supported.expectedCushionRestoredDate).toBe("2026-11-30");

    const unsupported = calculateBacklogSchedule({
      amountToZeroMinor: 134_800,
      cushionToRebuildMinor: 25_000,
      immediateReductionMinor: 29_000,
      monthlyReductionCapacityMinor: 0,
      planMonthEnd: "2026-07-31",
    });
    expect(unsupported.monthsToClearAmountToZero).toBeNull();
    expect(unsupported.expectedAmountToZeroDate).toBeNull();
    expect(unsupported.expectedCushionRestoredDate).toBeNull();
  });

  it("dates the repaired balance, cushion, healthy cycle and optional payment in order", () => {
    const plan = getCfoWorkspace()!.breakCyclePlan;

    expect(plan.backlog.remainingBacklogMinor).toBe(130_800);
    expect(plan.backlog.monthlyReductionCapacityMinor).toBe(9_246);
    expect(plan.backlog.expectedAmountToZeroDate).toBe("2027-07-31");
    expect(plan.backlog.expectedCushionRestoredDate).toBe("2027-10-31");
    expect(
      plan.milestonesUnderPlan.find((item) => item.id === "healthy_cycle")
        ?.estimatedDate,
    ).toBe("2027-11-30");
    expect(plan.debtEffect.optionalOverpaymentStartDate).toBe("2027-12-31");
    expect(plan.debtEffect.safeOptionalPaymentMinor).toBe(9_246);
    expect(plan.debtEffect.revisedDebtFreeDate).toBe("2029-09-30");
    expect(plan.debtEffect.currentDebtFreeDate).toBe("2031-02-28");
  });

  it("emits no repaired-balance date when the redirect is declined and the plan stays short", () => {
    const withoutRedirect = calculateRecurringPlanOutcome({
      surplusOrDeficitBeforePlanMinor: -15_220,
      recurringGapBeforePlanMinor: 35_720,
      grossMonthlySavingsMinor: 24_966,
      newlyFundedAllocationsMinor: 20_500,
    });
    expect(withoutRedirect.balanceAfterPlanMinor).toBeLessThan(0);
    const schedule = calculateBacklogSchedule({
      amountToZeroMinor: 134_800,
      cushionToRebuildMinor: 25_000,
      immediateReductionMinor: 29_000,
      monthlyReductionCapacityMinor:
        withoutRedirect.monthlyBacklogReductionMinor,
      planMonthEnd: "2026-07-31",
    });
    expect(schedule.expectedAmountToZeroDate).toBeNull();
    expect(schedule.expectedCushionRestoredDate).toBeNull();
  });
});
