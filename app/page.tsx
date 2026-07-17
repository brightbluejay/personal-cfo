import {
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
  StatusPill,
} from "@/components/ui";
import { getDashboardData } from "@/src/db/queries";
import { formatDate, formatMoney } from "@/src/lib/format";

export const dynamic = "force-dynamic";

export default function OverviewPage() {
  const data = getDashboardData();
  return (
    <>
      <PageHeader
        eyebrow="Evening 1 · Foundation"
        title="Your money, in context."
        description="A calm view of fictional cash, known commitments, and consumer debt. All figures come from the local seeded ledger."
        action={<StatusPill tone="good">Seeded demo</StatusPill>}
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Available cash"
          value={formatMoney(data.totals.cashMinor)}
          detail="Across fictional local accounts"
        />
        <StatCard
          label="Safe to spend"
          value={formatMoney(data.plan?.safeToSpendMinor ?? 0)}
          detail="After known costs and protected buffer"
          tone="sage"
        />
        <StatCard
          label="Consumer debt"
          value={formatMoney(data.totals.debtMinor)}
          detail={`${formatMoney(data.totals.debtMinimumMinor)} contractual minimums`}
          tone="rust"
        />
        <StatCard
          label="Confirmed income"
          value={formatMoney(data.totals.confirmedIncomeMinor)}
          detail="Within the seeded planning horizon"
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <SectionCard title="Accounts" eyebrow="Local ledger">
          {data.accounts.length ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Type</th>
                  <th>Balance</th>
                </tr>
              </thead>
              <tbody>
                {data.accounts.map((account) => (
                  <tr key={account.id}>
                    <td data-label="Account" className="font-medium">
                      {account.name}
                    </td>
                    <td data-label="Type" className="text-[var(--muted)]">
                      {account.type.replaceAll("_", " ")}
                    </td>
                    <td
                      data-label="Balance"
                      className="font-mono font-semibold"
                    >
                      {formatMoney(account.balanceMinor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState>
              Run the demo reset command to load fictional accounts.
            </EmptyState>
          )}
        </SectionCard>

        <SectionCard
          title="Planning position"
          eyebrow={data.plan?.month ?? "No plan"}
        >
          {data.plan ? (
            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--muted)]">
                  Protected buffer
                </span>
                <span className="font-mono text-sm font-semibold">
                  {formatMoney(data.plan.protectedBufferMinor)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--muted)]">
                  Committed costs
                </span>
                <span className="font-mono text-sm font-semibold">
                  {formatMoney(data.plan.committedCostsMinor)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--muted)]">
                  Debt minimums
                </span>
                <span className="font-mono text-sm font-semibold">
                  {formatMoney(data.plan.debtMinimumsMinor)}
                </span>
              </div>
              <div className="border-t border-[var(--line)] pt-4">
                <StatusPill
                  tone={
                    data.plan.status === "buffer_preserved" ? "good" : "warn"
                  }
                >
                  {data.plan.status.replaceAll("_", " ")}
                </StatusPill>
              </div>
            </div>
          ) : (
            <EmptyState>No monthly plan has been seeded.</EmptyState>
          )}
        </SectionCard>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <SectionCard
          title="Upcoming expenses"
          eyebrow="Confirmed and estimated"
        >
          <div className="divide-y divide-[var(--line)]">
            {data.upcoming.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-5 px-5 py-4"
              >
                <div>
                  <p className="text-sm font-medium">{item.description}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {formatDate(item.dueDate)} · {item.certainty}
                  </p>
                </div>
                <span className="font-mono text-sm font-semibold">
                  {formatMoney(item.amountMinor)}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard
          title="Recurring commitments"
          eyebrow="Cash-flow essentials"
        >
          <div className="divide-y divide-[var(--line)]">
            {data.commitments.slice(0, 4).map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-5 px-5 py-4"
              >
                <div>
                  <p className="text-sm font-medium">{item.name}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {item.frequency} · {item.isPaid ? "paid" : "still due"}
                  </p>
                </div>
                <span className="font-mono text-sm font-semibold">
                  {formatMoney(item.amountMinor)}
                </span>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>
    </>
  );
}
