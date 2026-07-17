import {
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
  StatusPill,
} from "@/components/ui";
import { getDashboardData } from "@/src/db/queries";
import { formatMoney } from "@/src/lib/format";

export const dynamic = "force-dynamic";

export default function MonthlyReviewPage() {
  const { plan } = getDashboardData();
  return (
    <>
      <PageHeader
        eyebrow="Calculated foundation"
        title="Monthly Review"
        description="A deterministic planning snapshot. GPT interpretation is intentionally not connected during Evening 1."
        action={<StatusPill>Local calculation</StatusPill>}
      />
      {plan ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Opening cash"
              value={formatMoney(plan.openingCashMinor)}
              detail={`Plan month ${plan.month}`}
            />
            <StatCard
              label="Expected income"
              value={formatMoney(plan.expectedIncomeMinor)}
              detail="Confirmed rows only"
            />
            <StatCard
              label="Known commitments"
              value={formatMoney(
                plan.committedCostsMinor + plan.debtMinimumsMinor,
              )}
              detail="Including contractual minimums"
            />
            <StatCard
              label="Safe to spend"
              value={formatMoney(plan.safeToSpendMinor)}
              detail="After the protected buffer"
              tone="sage"
            />
          </div>
          <SectionCard
            title="Review status"
            eyebrow="No external service"
            className="mt-6"
          >
            <div className="p-6">
              <StatusPill
                tone={plan.status === "buffer_preserved" ? "good" : "warn"}
              >
                {plan.status.replaceAll("_", " ")}
              </StatusPill>
              <p className="mt-4 max-w-2xl text-sm leading-6 text-[var(--muted)]">
                The seeded monthly plan includes confirmed income, unpaid
                essential commitments, contractual debt minimums, confirmed
                upcoming expenses, sinking-fund contributions, and the protected
                cash buffer. This is planning information, not regulated
                financial advice.
              </p>
            </div>
          </SectionCard>
          <SectionCard
            title="AI review"
            eyebrow="Deferred by scope"
            className="mt-6"
          >
            <EmptyState>
              No OpenAI API call is implemented tonight. A later session will
              validate a compact derived summary before requesting any
              interpretation.
            </EmptyState>
          </SectionCard>
        </>
      ) : (
        <SectionCard title="No plan">
          <EmptyState>
            Run the demo reset command to create the fictional monthly plan.
          </EmptyState>
        </SectionCard>
      )}
    </>
  );
}
