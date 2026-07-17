import {
  EmptyState,
  PageHeader,
  SectionCard,
  StatusPill,
} from "@/components/ui";
import { getDashboardData } from "@/src/db/queries";
import { formatDate, formatMoney } from "@/src/lib/format";

export const dynamic = "force-dynamic";

export default function TransactionsPage() {
  const { transactions } = getDashboardData();
  return (
    <>
      <PageHeader
        eyebrow="Local ledger"
        title="Transactions"
        description="Fictional ledger entries with deterministic fixture categories and their provenance."
        action={<StatusPill>{transactions.length} records</StatusPill>}
      />
      <SectionCard title="Seeded activity" eyebrow="Newest first">
        {transactions.length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Source</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((transaction) => (
                  <tr key={transaction.id}>
                    <td
                      data-label="Date"
                      className="whitespace-nowrap text-[var(--muted)]"
                    >
                      {formatDate(transaction.bookedDate)}
                    </td>
                    <td data-label="Description" className="font-medium">
                      {transaction.description}
                    </td>
                    <td data-label="Category">
                      {transaction.categoryName ?? "Uncategorised"}
                    </td>
                    <td data-label="Source">
                      <StatusPill
                        tone={
                          transaction.categoryConfidence >= 90
                            ? "good"
                            : "neutral"
                        }
                      >
                        {transaction.categoryProvenance}
                      </StatusPill>
                    </td>
                    <td
                      data-label="Amount"
                      className={`whitespace-nowrap font-mono font-semibold ${transaction.amountMinor < 0 ? "text-[var(--ink)]" : "text-[var(--sage-dark)]"}`}
                    >
                      {formatMoney(transaction.amountMinor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState>No fictional transactions are loaded.</EmptyState>
        )}
      </SectionCard>
    </>
  );
}
