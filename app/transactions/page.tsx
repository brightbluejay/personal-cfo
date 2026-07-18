import { PositionSummary } from "@/components/position-summary";
import { EmptyState, PageHeader, SectionCard } from "@/components/ui";
import { getCfoWorkspace } from "@/src/db/cfo-query";
import { getDashboardData } from "@/src/db/queries";
import { formatDate, formatMoney } from "@/src/lib/format";

export const dynamic = "force-dynamic";

export default function TransactionsPage() {
  const { transactions } = getDashboardData();
  const cfo = getCfoWorkspace();
  const movementLabels: Record<string, string> = {
    expense: "Purchase",
    income: "Income",
    internal_transfer: "Internal transfer",
    savings_transfer: "Savings transfer",
    debt_payment: "Debt payment",
    refund: "Refund",
    adjustment: "Adjustment",
    unknown: "Needs review",
  };
  return (
    <>
      <PageHeader
        eyebrow="Account activity"
        title="Transactions"
        description="Purchases, income and transfers are kept in one timeline. Transfers between your own accounts are not counted as spending."
      />
      {cfo ? <PositionSummary forecast={cfo.forecast} /> : null}
      <SectionCard title="Recent activity" eyebrow="Newest first">
        {transactions.length ? (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Movement</th>
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
                    <td
                      data-label="Movement"
                      className="capitalize text-[var(--muted)]"
                    >
                      {movementLabels[transaction.movementType] ??
                        "Needs review"}
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
          <EmptyState>No transactions are available.</EmptyState>
        )}
      </SectionCard>
    </>
  );
}
