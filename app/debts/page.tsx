import {
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
  StatusPill,
} from "@/components/ui";
import { getDashboardData } from "@/src/db/queries";
import { formatApr, formatDate, formatMoney } from "@/src/lib/format";

export const dynamic = "force-dynamic";

export default function DebtsPage() {
  const data = getDashboardData();
  return (
    <>
      <PageHeader
        eyebrow="Consumer debt"
        title="Debts"
        description="Contractual balances, rates, and minimums from the fictional local seed. Strategy simulation comes in a later session."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <StatCard
          label="Total balance"
          value={formatMoney(data.totals.debtMinor)}
          detail="Fictional consumer debts"
          tone="rust"
        />
        <StatCard
          label="Monthly minimums"
          value={formatMoney(data.totals.debtMinimumMinor)}
          detail="Included before optional overpayments"
        />
      </div>
      <SectionCard title="Debt accounts" eyebrow="Highest APR first">
        {data.debts.length ? (
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {data.debts.map((debt) => (
              <article
                key={debt.id}
                className="rounded-xl border border-[var(--line)] bg-[var(--canvas)] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold">{debt.name}</p>
                    <p className="mt-1 text-xs capitalize text-[var(--muted)]">
                      {debt.type.replaceAll("_", " ")}
                    </p>
                  </div>
                  {debt.promotionalEndDate ? (
                    <StatusPill tone="warn">Promo</StatusPill>
                  ) : null}
                </div>
                <p className="mt-6 font-mono text-2xl font-semibold">
                  {formatMoney(debt.balanceMinor)}
                </p>
                <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--line)] pt-4 text-xs">
                  <div>
                    <p className="text-[var(--faint)]">APR</p>
                    <p className="mt-1 font-semibold">
                      {formatApr(debt.aprBasisPoints)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--faint)]">Minimum</p>
                    <p className="mt-1 font-semibold">
                      {formatMoney(debt.minimumPaymentMinor)}
                    </p>
                  </div>
                </div>
                {debt.promotionalEndDate ? (
                  <p className="mt-4 text-xs text-[var(--rust)]">
                    Promotional period ends{" "}
                    {formatDate(debt.promotionalEndDate)}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState>No fictional debts are loaded.</EmptyState>
        )}
      </SectionCard>
    </>
  );
}
