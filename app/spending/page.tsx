import { EmptyState, PageHeader, SectionCard, StatCard } from "@/components/ui";
import { getDashboardData } from "@/src/db/queries";
import { formatMoney } from "@/src/lib/format";

export const dynamic = "force-dynamic";

export default function SpendingPage() {
  const data = getDashboardData();
  const total = data.spendingByCategory.reduce(
    (sum, item) => sum + item.amountMinor,
    0,
  );
  const largest = data.spendingByCategory[0]?.amountMinor ?? 1;
  return (
    <>
      <PageHeader
        eyebrow="Categorised locally"
        title="Spending"
        description="Outgoing fictional transactions grouped by their stored deterministic category."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Total outgoings"
          value={formatMoney(total)}
          detail="Across seeded transaction records"
        />
        <StatCard
          label="Categories"
          value={String(data.spendingByCategory.length)}
          detail="No model call required"
          tone="sage"
        />
      </div>
      <SectionCard title="Category breakdown" eyebrow="Seeded period">
        {data.spendingByCategory.length ? (
          <div className="space-y-5 p-5 sm:p-6">
            {data.spendingByCategory.map((item) => (
              <div key={item.category}>
                <div className="mb-2 flex items-baseline justify-between gap-4">
                  <span className="text-sm font-medium">{item.category}</span>
                  <span className="font-mono text-sm font-semibold">
                    {formatMoney(item.amountMinor)}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-[var(--panel)]">
                  <div
                    className="h-full rounded-full bg-[var(--sage-dark)]"
                    style={{
                      width: `${Math.max(4, (item.amountMinor / largest) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState>No outgoing transactions are available.</EmptyState>
        )}
      </SectionCard>
    </>
  );
}
