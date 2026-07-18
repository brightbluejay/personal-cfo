export interface DebtProjectionDebt {
  id: string;
  name: string;
  balanceMinor: number;
  aprBasisPoints: number;
  minimumPaymentMinor: number;
  promotionalAprBasisPoints: number | null;
  promotionalEndDate: string | null;
  postPromotionalAprBasisPoints: number | null;
}

export interface DebtSnapshotFact {
  debtId: string;
  snapshotDate: string;
  balanceMinor: number;
  paymentsMinor: number;
  interestChargedMinor: number;
  newBorrowingMinor: number;
}

export interface DebtProjection {
  monthlyExtraPaymentMinor: number;
  payoffDate: string | null;
  monthsToPayoff: number | null;
  totalInterestMinor: number;
  totalPaidMinor: number;
  warnings: string[];
}

export interface DebtTrajectory {
  currentBalanceMinor: number;
  previousBalanceMinor: number | null;
  balanceChangeMinor: number | null;
  recordedPaymentsMinor: number | null;
  recordedInterestMinor: number | null;
  recordedNewBorrowingMinor: number | null;
  increasedDespitePayments: boolean;
  currentPlan: DebtProjection;
  alternativePlan: DebtProjection;
  alternativeExtraPaymentMinor: number;
  assumptions: string[];
}

export const ALTERNATIVE_EXTRA_PAYMENT_MINOR = 20_000;

function addMonths(date: string, months: number) {
  const value = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() + months);
  return value.toISOString().slice(0, 10);
}

function monthEnd(date: string) {
  const value = new Date(`${date.slice(0, 7)}-01T00:00:00Z`);
  value.setUTCMonth(value.getUTCMonth() + 1);
  value.setUTCDate(0);
  return value.toISOString().slice(0, 10);
}

export function effectiveAprBasisPoints(
  debt: DebtProjectionDebt,
  date: string,
) {
  if (
    debt.promotionalAprBasisPoints !== null &&
    debt.promotionalEndDate &&
    date <= debt.promotionalEndDate
  ) {
    return debt.promotionalAprBasisPoints;
  }
  if (
    debt.promotionalEndDate &&
    date > debt.promotionalEndDate &&
    debt.postPromotionalAprBasisPoints !== null
  ) {
    return debt.postPromotionalAprBasisPoints;
  }
  return debt.aprBasisPoints;
}

export function projectDebtPayoff(input: {
  debts: DebtProjectionDebt[];
  asOfDate: string;
  monthlyExtraPaymentMinor: number;
  extraPaymentStartDate?: string | null;
  maximumMonths?: number;
}): DebtProjection {
  if (input.monthlyExtraPaymentMinor < 0) {
    throw new Error("Monthly extra payment cannot be negative.");
  }
  const balances = new Map(
    input.debts.map((debt) => [debt.id, Math.max(0, debt.balanceMinor)]),
  );
  const maximumMonths = input.maximumMonths ?? 600;
  let totalInterestMinor = 0;
  let totalPaidMinor = 0;
  let payoffDate: string | null = null;
  let monthsToPayoff: number | null = null;
  const warnings = input.debts.flatMap((debt) =>
    debt.promotionalEndDate && debt.postPromotionalAprBasisPoints !== null
      ? [
          `${debt.name}'s promotional rate expires on ${debt.promotionalEndDate}; the recorded post-promotion rate is used after that date.`,
        ]
      : [],
  );

  for (let month = 1; month <= maximumMonths; month += 1) {
    const projectionDate = addMonths(input.asOfDate, month);
    const active = input.debts.filter(
      (debt) => (balances.get(debt.id) ?? 0) > 0,
    );
    if (!active.length) {
      monthsToPayoff = month - 1;
      payoffDate = monthEnd(addMonths(input.asOfDate, month - 1));
      break;
    }

    for (const debt of active) {
      const balance = balances.get(debt.id) ?? 0;
      const interestMinor = Math.round(
        (balance * effectiveAprBasisPoints(debt, projectionDate)) / 120_000,
      );
      balances.set(debt.id, balance + interestMinor);
      totalInterestMinor += interestMinor;
    }

    for (const debt of active) {
      const balance = balances.get(debt.id) ?? 0;
      const paymentMinor = Math.min(balance, debt.minimumPaymentMinor);
      balances.set(debt.id, balance - paymentMinor);
      totalPaidMinor += paymentMinor;
    }

    let extraRemainingMinor =
      !input.extraPaymentStartDate ||
      projectionDate >= input.extraPaymentStartDate
        ? input.monthlyExtraPaymentMinor
        : 0;
    const priorityOrder = [...active].sort(
      (left, right) =>
        effectiveAprBasisPoints(right, projectionDate) -
          effectiveAprBasisPoints(left, projectionDate) ||
        (balances.get(right.id) ?? 0) - (balances.get(left.id) ?? 0),
    );
    for (const debt of priorityOrder) {
      if (extraRemainingMinor <= 0) break;
      const balance = balances.get(debt.id) ?? 0;
      const paymentMinor = Math.min(balance, extraRemainingMinor);
      balances.set(debt.id, balance - paymentMinor);
      totalPaidMinor += paymentMinor;
      extraRemainingMinor -= paymentMinor;
    }

    if ([...balances.values()].every((balance) => balance <= 0)) {
      monthsToPayoff = month;
      payoffDate = monthEnd(projectionDate);
      break;
    }
  }

  if (!payoffDate) {
    warnings.push(
      `The balances do not clear within the ${maximumMonths}-month projection limit at the specified payments.`,
    );
  }
  return {
    monthlyExtraPaymentMinor: input.monthlyExtraPaymentMinor,
    payoffDate,
    monthsToPayoff,
    totalInterestMinor,
    totalPaidMinor,
    warnings,
  };
}

export function buildDebtTrajectory(input: {
  debts: DebtProjectionDebt[];
  snapshots: DebtSnapshotFact[];
  asOfDate: string;
  safeExtraPaymentMinor: number;
  alternativeExtraPaymentMinor?: number;
}): DebtTrajectory {
  const snapshotDates = [
    ...new Set(input.snapshots.map((item) => item.snapshotDate)),
  ]
    .sort()
    .reverse();
  const latestDate = snapshotDates[0];
  const previousDate = snapshotDates[1];
  const latest = input.snapshots.filter(
    (snapshot) => snapshot.snapshotDate === latestDate,
  );
  const previous = input.snapshots.filter(
    (snapshot) => snapshot.snapshotDate === previousDate,
  );
  const sum = (items: DebtSnapshotFact[], key: keyof DebtSnapshotFact) =>
    items.reduce((total, item) => total + Number(item[key]), 0);
  const currentBalanceMinor = input.debts.reduce(
    (total, debt) => total + debt.balanceMinor,
    0,
  );
  const previousBalanceMinor = previousDate
    ? sum(previous, "balanceMinor")
    : null;
  const balanceChangeMinor =
    previousBalanceMinor === null
      ? null
      : currentBalanceMinor - previousBalanceMinor;
  const recordedPaymentsMinor = latestDate
    ? sum(latest, "paymentsMinor")
    : null;
  const recordedInterestMinor = latestDate
    ? sum(latest, "interestChargedMinor")
    : null;
  const recordedNewBorrowingMinor = latestDate
    ? sum(latest, "newBorrowingMinor")
    : null;
  const alternativeExtraPaymentMinor =
    input.alternativeExtraPaymentMinor ?? ALTERNATIVE_EXTRA_PAYMENT_MINOR;
  return {
    currentBalanceMinor,
    previousBalanceMinor,
    balanceChangeMinor,
    recordedPaymentsMinor,
    recordedInterestMinor,
    recordedNewBorrowingMinor,
    increasedDespitePayments: Boolean(
      balanceChangeMinor !== null &&
      balanceChangeMinor > 0 &&
      recordedPaymentsMinor !== null &&
      recordedPaymentsMinor > 0,
    ),
    currentPlan: projectDebtPayoff({
      debts: input.debts,
      asOfDate: input.asOfDate,
      monthlyExtraPaymentMinor: Math.max(0, input.safeExtraPaymentMinor),
    }),
    alternativePlan: projectDebtPayoff({
      debts: input.debts,
      asOfDate: input.asOfDate,
      monthlyExtraPaymentMinor: alternativeExtraPaymentMinor,
    }),
    alternativeExtraPaymentMinor,
    assumptions: [
      "Balances, minimum payments and rates come from the fictional ledger.",
      "Interest is rounded to the nearest penny once per month.",
      "Minimum payments are made monthly and extra money targets the highest effective APR.",
      "No new borrowing, fees or missed payments are assumed after the as-of date.",
    ],
  };
}
