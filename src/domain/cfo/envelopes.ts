import {
  isConsumption,
  type CfoAccount,
  type CfoTransaction,
  type ReconciliationResult,
} from "./types";

export interface FundingEnvelopeInsight {
  accountId: string;
  purpose: string | null;
  allocatedMinor: number;
  eligibleSpendingMinor: number;
  fallbackSpendingMinor: number;
  effectiveSpendingMinor: number;
  exhaustedDate: string | null;
  exceededMinor: number;
  underspentMinor: number;
  evidenceIds: string[];
}

export function calculateFundingEnvelopes(
  accounts: CfoAccount[],
  transactions: CfoTransaction[],
  reconciliation: ReconciliationResult,
  periodStart: string,
  periodEnd: string,
): FundingEnvelopeInsight[] {
  const transactionsById = new Map(
    transactions.map((transaction) => [transaction.id, transaction]),
  );
  const ownedAccountIds = new Set(
    accounts
      .filter((account) => account.ownership === "owned")
      .map((account) => account.id),
  );

  return accounts
    .filter(
      (account) =>
        account.ownership === "owned" &&
        account.role === "spending" &&
        account.envelopeCategorySlugs.length > 0,
    )
    .map((account) => {
      const groups = reconciliation.groups.filter(
        (group) =>
          group.status === "matched" &&
          group.transactionIds.some(
            (id) => transactionsById.get(id)?.accountId === account.id,
          ),
      );
      const allocations = groups
        .flatMap((group) =>
          group.transactionIds
            .map((id) => transactionsById.get(id))
            .filter((transaction): transaction is CfoTransaction =>
              Boolean(transaction),
            ),
        )
        .filter(
          (transaction) =>
            transaction.accountId === account.id &&
            transaction.amountMinor > 0 &&
            transaction.bookedDate >= periodStart &&
            transaction.bookedDate <= periodEnd,
        );
      const eligibleSpending = transactions
        .filter(
          (transaction) =>
            transaction.accountId === account.id &&
            transaction.bookedDate >= periodStart &&
            transaction.bookedDate <= periodEnd,
        )
        .filter(
          (transaction) =>
            transaction.categorySlug &&
            account.envelopeCategorySlugs.includes(transaction.categorySlug),
        )
        .filter((transaction) =>
          isConsumption(
            reconciliation.effectiveMovementTypes[transaction.id] ??
              transaction.movementType,
          ),
        )
        .sort((left, right) => left.bookedDate.localeCompare(right.bookedDate));
      const allocatedMinor = allocations.reduce(
        (sum, transaction) => sum + transaction.amountMinor,
        0,
      );
      const eligibleSpendingMinor = eligibleSpending.reduce(
        (sum, transaction) => sum + Math.abs(transaction.amountMinor),
        0,
      );

      let runningAllocation = 0;
      let runningSpend = 0;
      let exhaustedDate: string | null = null;
      const events = [...allocations, ...eligibleSpending].sort((left, right) =>
        left.bookedDate.localeCompare(right.bookedDate),
      );
      for (const event of events) {
        if (event.amountMinor > 0) runningAllocation += event.amountMinor;
        else runningSpend += Math.abs(event.amountMinor);
        if (
          !exhaustedDate &&
          runningAllocation > 0 &&
          runningSpend >= runningAllocation
        )
          exhaustedDate = event.bookedDate;
      }

      const fallbackSpendingMinor = transactions
        .filter(
          (transaction) =>
            transaction.accountId !== account.id &&
            ownedAccountIds.has(transaction.accountId),
        )
        .filter(
          (transaction) =>
            transaction.categorySlug &&
            account.envelopeCategorySlugs.includes(transaction.categorySlug),
        )
        .filter(
          (transaction) =>
            !exhaustedDate || transaction.bookedDate >= exhaustedDate,
        )
        .filter(
          (transaction) =>
            transaction.bookedDate >= periodStart &&
            transaction.bookedDate <= periodEnd,
        )
        .filter((transaction) =>
          isConsumption(
            reconciliation.effectiveMovementTypes[transaction.id] ??
              transaction.movementType,
          ),
        )
        .reduce(
          (sum, transaction) => sum + Math.abs(transaction.amountMinor),
          0,
        );
      const effectiveSpendingMinor =
        eligibleSpendingMinor + fallbackSpendingMinor;

      return {
        accountId: account.id,
        purpose: account.purpose,
        allocatedMinor,
        eligibleSpendingMinor,
        fallbackSpendingMinor,
        effectiveSpendingMinor,
        exhaustedDate,
        exceededMinor: Math.max(0, effectiveSpendingMinor - allocatedMinor),
        underspentMinor: Math.max(0, allocatedMinor - effectiveSpendingMinor),
        evidenceIds: [...allocations, ...eligibleSpending].map(
          (transaction) => `transaction:${transaction.id}`,
        ),
      };
    });
}
