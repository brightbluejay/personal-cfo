import { EmptyState, PageHeader, SectionCard, StatCard } from "@/components/ui";
import { getCfoWorkspace } from "@/src/db/cfo-query";
import { formatMoney } from "@/src/lib/format";

export const dynamic = "force-dynamic";

export default function SpendingPage() {
  const cfo = getCfoWorkspace();
  if (!cfo) {
    return (
      <>
        <PageHeader
          eyebrow="Spending"
          title="Spending"
          description="No monthly spending position is available."
        />
        <SectionCard title="No spending available">
          <EmptyState>The demonstration data has not been loaded.</EmptyState>
        </SectionCard>
      </>
    );
  }
  const total = cfo.currentMonthSpending.reduce(
    (sum, item) => sum + item.amountMinor,
    0,
  );
  const largest = cfo.currentMonthSpending[0]?.amountMinor ?? 1;
  return (
    <>
      <PageHeader
        eyebrow="This month"
        title="Spending"
        description="Purchases are shown once. Internal transfers, savings transfers and debt payments are excluded from these totals."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Spent this month"
          value={formatMoney(total)}
          detail="Purchases recorded up to the current planning date"
        />
        <StatCard
          label="Above recent usual"
          value={formatMoney(cfo.spendingSummary.aboveRecentUsualMinor)}
          detail="Higher routine spending already recorded"
          tone="rust"
        />
        <StatCard
          label="Still reducible"
          value={formatMoney(cfo.spendingSummary.reducibleRemainingMinor)}
          detail="Only usual spending that has not happened yet"
          tone="sage"
        />
        <StatCard
          label="Can repair the cash gap"
          value={formatMoney(cfo.spendingSummary.cashGapRepairableMinor)}
          detail={`${formatMoney(cfo.spendingSummary.alreadyHappenedMinor)} above usual has already happened`}
        />
      </div>
      <SectionCard title="Spending that is higher than usual" className="mb-6">
        <div className="divide-y divide-[var(--line)]">
          {cfo.anomalies.length ? (
            cfo.anomalies.map((item) => {
              const name =
                cfo.categories.find(
                  (category) => category.slug === item.categorySlug,
                )?.name ?? item.categorySlug.replaceAll("-", " ");
              return (
                <div className="px-5 py-4" key={item.categorySlug}>
                  <div className="flex flex-wrap items-baseline justify-between gap-3">
                    <p className="text-sm font-semibold">{name}</p>
                    <span className="font-mono text-sm font-semibold">
                      +{formatMoney(item.changeMinor)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--muted)]">
                    You have spent {formatMoney(item.currentMinor)} on{" "}
                    {name.toLowerCase()} this month,{" "}
                    {formatMoney(item.changeMinor)} more than the recent usual{" "}
                    {formatMoney(item.baselineMinor)} by this point.
                  </p>
                  <p className="mt-1 text-xs font-medium text-[var(--sage-dark)]">
                    {item.canStillReduce
                      ? `${formatMoney(item.projectedRemainingMinor)} is still expected and could be reduced.`
                      : "This spending has already happened and is not part of the action plan."}
                  </p>
                </div>
              );
            })
          ) : (
            <EmptyState>
              No spending is materially higher than usual.
            </EmptyState>
          )}
        </div>
      </SectionCard>
      <SectionCard title="Repeated patterns" className="mb-6">
        {cfo.repeatedSpendingPatterns.length ? (
          <div className="divide-y divide-[var(--line)]">
            {cfo.repeatedSpendingPatterns.map((pattern) => {
              const name =
                cfo.categories.find(
                  (category) => category.slug === pattern.categorySlug,
                )?.name ?? pattern.categorySlug.replaceAll("-", " ");
              return (
                <div key={pattern.categorySlug} className="px-5 py-4">
                  <p className="text-sm font-semibold">{name}</p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    {pattern.explanation} Latest month-to-date:{" "}
                    {formatMoney(pattern.latestMonthMinor)}; previous:{" "}
                    {formatMoney(pattern.previousMonthMinor)}.
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState>
            The available history does not support a repeated upward pattern.
            One-off costs are not annualised.
          </EmptyState>
        )}
      </SectionCard>
      <SectionCard title="Spending by category" eyebrow="This month to date">
        {cfo.currentMonthSpending.length ? (
          <div className="space-y-5 p-5 sm:p-6">
            {cfo.currentMonthSpending.map((item) => (
              <div key={item.slug}>
                <div className="mb-2 flex items-baseline justify-between gap-4">
                  <span className="text-sm font-medium">{item.name}</span>
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
          <EmptyState>No purchases are available.</EmptyState>
        )}
      </SectionCard>
    </>
  );
}
