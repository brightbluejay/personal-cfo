import { describe, expect, it } from "vitest";
import {
  buildDebtTrajectory,
  effectiveAprBasisPoints,
  projectDebtPayoff,
  type DebtProjectionDebt,
} from "../src/domain/cfo/debt-projection";

const debts: DebtProjectionDebt[] = [
  {
    id: "card",
    name: "Example card",
    balanceMinor: 100_000,
    aprBasisPoints: 2_400,
    minimumPaymentMinor: 5_000,
    promotionalAprBasisPoints: null,
    promotionalEndDate: null,
    postPromotionalAprBasisPoints: null,
  },
  {
    id: "promo",
    name: "Example promotion",
    balanceMinor: 80_000,
    aprBasisPoints: 0,
    minimumPaymentMinor: 4_000,
    promotionalAprBasisPoints: 0,
    promotionalEndDate: "2026-08-31",
    postPromotionalAprBasisPoints: 1_800,
  },
];

describe("deterministic debt trajectory", () => {
  it("records debt growth despite payments only when explicit activity supports it", () => {
    const trajectory = buildDebtTrajectory({
      debts,
      asOfDate: "2026-07-18",
      safeExtraPaymentMinor: 0,
      snapshots: [
        {
          debtId: "card",
          snapshotDate: "2026-06-18",
          balanceMinor: 90_000,
          paymentsMinor: 0,
          interestChargedMinor: 0,
          newBorrowingMinor: 0,
        },
        {
          debtId: "promo",
          snapshotDate: "2026-06-18",
          balanceMinor: 80_000,
          paymentsMinor: 0,
          interestChargedMinor: 0,
          newBorrowingMinor: 0,
        },
        {
          debtId: "card",
          snapshotDate: "2026-07-18",
          balanceMinor: 100_000,
          paymentsMinor: 5_000,
          interestChargedMinor: 2_000,
          newBorrowingMinor: 13_000,
        },
        {
          debtId: "promo",
          snapshotDate: "2026-07-18",
          balanceMinor: 80_000,
          paymentsMinor: 4_000,
          interestChargedMinor: 0,
          newBorrowingMinor: 4_000,
        },
      ],
    });
    expect(trajectory.balanceChangeMinor).toBe(10_000);
    expect(trajectory.recordedPaymentsMinor).toBe(9_000);
    expect(trajectory.recordedNewBorrowingMinor).toBe(17_000);
    expect(trajectory.increasedDespitePayments).toBe(true);
  });

  it("does not invent new borrowing when snapshots record none", () => {
    const trajectory = buildDebtTrajectory({
      debts,
      asOfDate: "2026-07-18",
      safeExtraPaymentMinor: 0,
      snapshots: [
        {
          debtId: "card",
          snapshotDate: "2026-07-18",
          balanceMinor: 100_000,
          paymentsMinor: 5_000,
          interestChargedMinor: 2_000,
          newBorrowingMinor: 0,
        },
      ],
    });
    expect(trajectory.recordedNewBorrowingMinor).toBe(0);
    expect(trajectory.increasedDespitePayments).toBe(false);
  });

  it("uses the post-promotion rate only after expiry", () => {
    expect(effectiveAprBasisPoints(debts[1], "2026-08-01")).toBe(0);
    expect(effectiveAprBasisPoints(debts[1], "2026-09-01")).toBe(1_800);
  });

  it("shortens payoff and lowers interest with a specified extra payment", () => {
    const minimums = projectDebtPayoff({
      debts,
      asOfDate: "2026-07-18",
      monthlyExtraPaymentMinor: 0,
    });
    const overpayment = projectDebtPayoff({
      debts,
      asOfDate: "2026-07-18",
      monthlyExtraPaymentMinor: 10_000,
    });
    expect(overpayment.monthsToPayoff).toBeLessThan(minimums.monthsToPayoff!);
    expect(overpayment.totalInterestMinor).toBeLessThan(
      minimums.totalInterestMinor,
    );
    expect(minimums.totalPaidMinor).toBe(
      debts.reduce((sum, debt) => sum + debt.balanceMinor, 0) +
        minimums.totalInterestMinor,
    );
    expect(
      overpayment.warnings.some((warning) => warning.includes("expires")),
    ).toBe(true);
  });
});
