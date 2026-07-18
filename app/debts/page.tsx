import {
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
  StatusPill,
} from "@/components/ui";
import { getCfoWorkspace } from "@/src/db/cfo-query";
import { formatApr, formatDate, formatMoney } from "@/src/lib/format";

export const dynamic = "force-dynamic";

export default function DebtsPage() {
  const cfo = getCfoWorkspace();
  if (!cfo) {
    return (
      <>
        <PageHeader
          eyebrow="Consumer debt"
          title="Debts"
          description="No debt position is available."
        />
        <SectionCard title="No debts available">
          <EmptyState>The demonstration data has not been loaded.</EmptyState>
        </SectionCard>
      </>
    );
  }
  const totalDebtMinor = cfo.debtRecords.reduce(
    (sum, debt) => sum + debt.balanceMinor,
    0,
  );
  return (
    <>
      <PageHeader
        eyebrow="Consumer debt"
        title="Debts"
        description="Keep every required minimum payment protected. Optional overpayments come after the cash-flow position is stable."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total balance"
          value={formatMoney(totalDebtMinor)}
          detail="Across the debts listed below"
          tone="rust"
        />
        <StatCard
          label="Required minimums"
          value={formatMoney(cfo.debtAction.requiredMinimumsMinor)}
          detail={
            cfo.debtTrajectory.recordedInterestMinor === null
              ? `${formatMoney(cfo.debtAction.minimumsPaidMinor)} already recorded as paid; no snapshot interest is available`
              : `${formatMoney(cfo.debtAction.minimumsPaidMinor)} paid; ${formatMoney(cfo.debtTrajectory.recordedInterestMinor)} interest recorded in the latest snapshot`
          }
        />
        <StatCard
          label="Change since previous snapshot"
          value={
            cfo.debtTrajectory.balanceChangeMinor === null
              ? "Not available"
              : `${cfo.debtTrajectory.balanceChangeMinor >= 0 ? "+" : "−"}${formatMoney(Math.abs(cfo.debtTrajectory.balanceChangeMinor))}`
          }
          detail={
            cfo.debtTrajectory.increasedDespitePayments
              ? "Debt increased despite recorded payments"
              : "Based on the two latest recorded snapshots"
          }
          tone={cfo.debtTrajectory.increasedDespitePayments ? "rust" : "plain"}
        />
        <StatCard
          label="Recorded new borrowing"
          value={
            cfo.debtTrajectory.recordedNewBorrowingMinor === null
              ? "Not available"
              : formatMoney(cfo.debtTrajectory.recordedNewBorrowingMinor)
          }
          detail="Explicit snapshot activity; not inferred from balance change"
          tone="rust"
        />
      </div>

      <SectionCard title="Route out of debt" className="mb-6">
        <div className="grid gap-px bg-[var(--line)] md:grid-cols-2">
          <div className="bg-white p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--faint)]">
              Current minimum-payment plan
            </p>
            <p className="mt-3 text-xl font-semibold">
              {cfo.debtTrajectory.currentPlan.payoffDate
                ? `Debt-free by ${formatDate(cfo.debtTrajectory.currentPlan.payoffDate)}`
                : "No payoff date within the projection limit"}
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Projected interest:{" "}
              {formatMoney(cfo.debtTrajectory.currentPlan.totalInterestMinor)}.
              Safe optional overpayment today:{" "}
              {formatMoney(
                cfo.debtTrajectory.currentPlan.monthlyExtraPaymentMinor,
              )}
              .
            </p>
          </div>
          <div className="bg-[var(--sage-soft)] p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--sage-dark)]">
              Once cash flow is healthy
            </p>
            <p className="mt-3 text-xl font-semibold">
              {cfo.debtTrajectory.alternativePlan.payoffDate
                ? `Debt-free by ${formatDate(cfo.debtTrajectory.alternativePlan.payoffDate)}`
                : "No payoff date within the projection limit"}
            </p>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Scenario:{" "}
              {formatMoney(cfo.debtTrajectory.alternativeExtraPaymentMinor)}{" "}
              extra each month. Projected interest:{" "}
              {formatMoney(
                cfo.debtTrajectory.alternativePlan.totalInterestMinor,
              )}
              .
            </p>
          </div>
        </div>
        <div className="border-t border-[var(--line)] px-5 py-4 text-xs leading-5 text-[var(--muted)]">
          <p>{cfo.debtTrajectory.assumptions.join(" ")}</p>
          {cfo.debtTrajectory.currentPlan.warnings.map((warning) => (
            <p key={warning} className="mt-2 text-[var(--rust)]">
              {warning}
            </p>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="What to do this month" className="mb-6">
        <div className="grid gap-4 p-5 md:grid-cols-3">
          <div className="rounded-xl bg-[var(--canvas)] p-4">
            <p className="text-xs text-[var(--faint)]">
              Safe optional overpayment
            </p>
            <p className="mt-2 font-mono text-xl font-semibold">
              {formatMoney(cfo.debtAction.additionalPaymentSafeMinor)}
            </p>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
              {cfo.debtAction.stabiliseCashFirst
                ? "Avoid the projected overdraft and restore the safety cushion first."
                : "This amount could be used without breaching the safety cushion."}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--canvas)] p-4">
            <p className="text-xs text-[var(--faint)]">Next target debt</p>
            <p className="mt-2 text-xl font-semibold">
              {cfo.debtAction.priorityDebtName ?? "No debt selected"}
            </p>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
              {cfo.debtAction.priorityReason}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--canvas)] p-4">
            <p className="text-xs text-[var(--faint)]">Minimums still due</p>
            <p className="mt-2 font-mono text-xl font-semibold">
              {formatMoney(cfo.debtAction.minimumsRemainingMinor)}
            </p>
            <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
              Required payments are never offered as spending reductions.
            </p>
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Debt accounts"
        eyebrow="Highest recorded standard rate first"
      >
        {cfo.debtRecords.length ? (
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {cfo.debtRecords.map((debt) => (
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
                    <StatusPill tone="warn">Promotional rate</StatusPill>
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
                    {debt.postPromotionalAprBasisPoints !== null
                      ? `; recorded rate after expiry: ${formatApr(debt.postPromotionalAprBasisPoints)}`
                      : "."}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        ) : (
          <EmptyState>No debts are available.</EmptyState>
        )}
      </SectionCard>
    </>
  );
}
