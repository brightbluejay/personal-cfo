import { describe, expect, it } from "vitest";
import {
  applyActionPlanToForecast,
  calculateCashForecast,
  classifyFinancialHealth,
} from "../src/domain/cfo/forecast";
import { buildRecoveryPlan } from "../src/domain/cfo/recovery-plan";
import { simulatePurchase } from "../src/domain/cfo/scenario";
import type { CfoCategory } from "../src/domain/cfo/types";

const forecast = calculateCashForecast({
  asOfDate: "2026-07-15",
  monthEndDate: "2026-07-31",
  accessibleCashMinor: 42_000,
  reservedSavingsMinor: 27_000,
  safetyCushionMinor: 25_000,
  events: [
    {
      id: "bill",
      date: "2026-07-18",
      amountMinor: -60_000,
      kind: "commitment",
      label: "Bill",
    },
    {
      id: "income",
      date: "2026-07-25",
      amountMinor: 100_000,
      kind: "income",
      label: "Income",
    },
  ],
});

describe("canonical cash forecast", () => {
  it("applies the documented financial-health rules in risk order", () => {
    const nextIncome = {
      eventId: "income",
      amountMinor: 100_000,
      date: "2026-07-25",
      label: "Income",
      incomeType: "other",
      balanceBeforeMinor: -5_000,
      balanceAfterMinor: 95_000,
      negativeBalanceClearedMinor: 5_000,
      negativeBalanceClearedBasisPoints: 500,
      commitmentsAfterIncomeMinor: 0,
      protectedDebtPaymentsAfterIncomeMinor: 0,
      remainingSpendingMinor: 0,
      remainingAccessibleCashMinor: 95_000,
      safetyCushionRequirementMinor: 25_000,
      safetyCushionAllocationMinor: 25_000,
      genuinelyUnallocatedMinor: 70_000,
    };
    expect(
      classifyFinancialHealth({
        projectedMonthEndBalanceMinor: -1,
        lowestProjectedBalanceMinor: -20_000,
        safetyCushionMinor: 25_000,
        nextIncome,
      }).classification,
    ).toBe("worsening_debt_position");
    expect(
      classifyFinancialHealth({
        projectedMonthEndBalanceMinor: 1,
        lowestProjectedBalanceMinor: -5_000,
        safetyCushionMinor: 25_000,
        nextIncome,
      }).classification,
    ).toBe("relying_on_next_income");
    expect(
      classifyFinancialHealth({
        projectedMonthEndBalanceMinor: 30_000,
        lowestProjectedBalanceMinor: 10_000,
        safetyCushionMinor: 25_000,
        nextIncome: null,
      }).classification,
    ).toBe("tight_but_stable");
    expect(
      classifyFinancialHealth({
        projectedMonthEndBalanceMinor: 30_000,
        lowestProjectedBalanceMinor: 25_000,
        safetyCushionMinor: 25_000,
        nextIncome: null,
      }).classification,
    ).toBe("healthy");
  });
  it("sets safe-to-spend to zero whenever the dated forecast contains an overdraft", () => {
    expect(forecast.projectedMonthEndBalanceMinor).toBe(82_000);
    expect(forecast.lowestProjectedBalanceMinor).toBe(-18_000);
    expect(forecast.projectedOverdraftMinor).toBe(18_000);
    expect(forecast.safeToSpendNowMinor).toBe(0);
    expect(forecast.status).toBe("projected_overdraft");
    expect(forecast.financialHealth).toBe("overdraft_cycle");
    expect(forecast.nextIncome).toMatchObject({
      balanceBeforeMinor: -18_000,
      balanceAfterMinor: 82_000,
      negativeBalanceClearedMinor: 18_000,
      negativeBalanceClearedBasisPoints: 1_800,
    });
    expect(forecast.reliesOnFutureIncome).toBe(true);
    expect(forecast.daysBelowZero).toBe(7);
  });

  it("allocates only the next income even when cash was already positive", () => {
    const positive = calculateCashForecast({
      asOfDate: "2026-07-15",
      monthEndDate: "2026-07-31",
      accessibleCashMinor: 50_000,
      reservedSavingsMinor: 0,
      safetyCushionMinor: 25_000,
      events: [
        {
          id: "income",
          date: "2026-07-20",
          amountMinor: 100_000,
          kind: "income",
          label: "Income",
        },
        {
          id: "bill",
          date: "2026-07-22",
          amountMinor: -20_000,
          kind: "commitment",
          label: "Bill",
        },
      ],
    });
    const income = positive.nextIncome!;
    expect(
      income.negativeBalanceClearedMinor +
        income.commitmentsAfterIncomeMinor +
        income.protectedDebtPaymentsAfterIncomeMinor +
        income.remainingSpendingMinor +
        income.safetyCushionAllocationMinor +
        income.genuinelyUnallocatedMinor,
    ).toBe(income.amountMinor);
    expect(income.genuinelyUnallocatedMinor).toBe(55_000);
  });

  it("never turns a protected debt category into a recovery action", () => {
    const categories: CfoCategory[] = [
      {
        id: "debt",
        name: "Debt payment",
        slug: "debt-payment",
        isEssential: true,
        flexibility: "protected",
      },
      {
        id: "coffee",
        name: "Coffee",
        slug: "coffee",
        isEssential: false,
        flexibility: "flexible",
      },
    ];
    const recovery = buildRecoveryPlan({
      amountNeededToRestoreSafetyCushionMinor: 40_000,
      amountNeededToAvoidOverdraftMinor: 18_000,
      reservedSavingsMinor: 0,
      categories,
      baseline: [
        {
          categorySlug: "debt-payment",
          baselineMinor: 0,
          currentMinor: 41_300,
          changeMinor: 41_300,
          changePercent: null,
          sampleMonths: 3,
          projectedRemainingMinor: 41_300,
        },
        {
          categorySlug: "coffee",
          baselineMinor: 1_500,
          currentMinor: 5_600,
          changeMinor: 4_100,
          changePercent: 273,
          sampleMonths: 3,
          projectedRemainingMinor: 500,
        },
      ],
    });
    expect(
      recovery.actions.flatMap((action) => action.categorySlugs),
    ).not.toContain("debt-payment");
    expect(recovery.spendingReductionMinor).toBe(500);
  });

  it("keeps scenario status, maximum safe amount and forecast balances aligned", () => {
    const afterAction = applyActionPlanToForecast(forecast, {
      accessibleCashIncreaseMinor: 10_000,
      spendingReductionMinor: 0,
    });
    const scenario = simulatePurchase({
      beforeAction: forecast,
      afterAction,
      amountMinor: 1_000,
      date: "2026-07-20",
    });
    expect(scenario.maximumSafeAmountMinor).toBe(0);
    expect(scenario.result).toBe("unsafe");
    expect(scenario.afterPurchaseLowestBalanceMinor).toBeLessThan(0);
    expect(afterAction.nextIncome).toMatchObject({
      balanceBeforeMinor: -8_000,
      balanceAfterMinor: 92_000,
      negativeBalanceClearedMinor: 8_000,
      negativeBalanceClearedBasisPoints: 800,
    });
    expect(() =>
      simulatePurchase({
        beforeAction: forecast,
        afterAction,
        amountMinor: 0,
        date: "2026-07-20",
      }),
    ).toThrow();
  });
});
