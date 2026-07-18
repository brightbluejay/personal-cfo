import { CfoBrief } from "@/components/cfo-brief";
import { ScenarioSimulator } from "@/components/scenario-simulator";
import {
  EmptyState,
  PageHeader,
  SectionCard,
  StatusPill,
} from "@/components/ui";
import { getCfoWorkspace } from "@/src/db/cfo-query";
import { buildFallbackNarrative } from "@/src/domain/cfo/narrative-output";
import { formatDate, formatMoney, formatMonth } from "@/src/lib/format";

export const dynamic = "force-dynamic";

function stageLabel(value: string) {
  return value.replaceAll("_", " ");
}

function coverage(value: number) {
  return `${(value / 100).toFixed(1)}%`;
}

export default function MonthlyReviewPage() {
  const cfo = getCfoWorkspace();
  if (!cfo) {
    return (
      <>
        <PageHeader
          eyebrow="This month"
          title="Your Action Plan"
          description="No monthly plan is available."
        />
        <SectionCard title="No plan available">
          <EmptyState>The demonstration data has not been loaded.</EmptyState>
        </SectionCard>
      </>
    );
  }

  const plan = cfo.breakCyclePlan;
  const flow = plan.recurringFlow;
  const actions = plan.recurringActions;
  const backlog = plan.backlog;
  const nextIncome = cfo.forecast.nextIncome;
  const incomeName =
    nextIncome?.incomeType === "salary" ? "payday" : "the next income";

  return (
    <>
      <PageHeader
        eyebrow={`${formatMonth(cfo.forecast.monthEndDate)} plan`}
        title="Your Action Plan"
        description="Separate the immediate timing gap from the repeatable monthly cycle. Code protects required payments, funds irregular costs once, and keeps the one-off backlog out of the monthly target."
        action={
          <StatusPill tone="warn">{stageLabel(actions.status)}</StatusPill>
        }
      />

      <div className="space-y-6">
        <SectionCard
          title="Get through this month"
          eyebrow="Immediate July plan"
        >
          <div className="divide-y divide-[var(--line)]">
            <div className="px-5 py-4">
              <p className="text-sm font-semibold">
                Prepare for a{" "}
                {formatMoney(cfo.forecast.projectedOverdraftMinor)} low before{" "}
                {incomeName}
              </p>
              <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                The low is expected on{" "}
                {formatDate(cfo.forecast.lowestProjectedBalanceDate)}. These are
                one-off timing actions, not recurring monthly savings.
              </p>
            </div>
            {cfo.recovery.actions.map((action) => (
              <div key={action.id} className="px-5 py-4">
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">{action.title}</p>
                    <p className="mt-1 max-w-3xl text-xs leading-5 text-[var(--muted)]">
                      {action.explanation}
                    </p>
                  </div>
                  <p className="font-mono text-sm font-semibold">
                    {formatMoney(action.improvementMinor)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Monthly cycle" eyebrow="Recurring flow">
          <div className="grid gap-px bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Normal monthly income", flow.normalisedMonthlyIncomeMinor],
              [
                "Normal month before changes",
                flow.totalNormalisedMonthlyOutgoingsMinor,
              ],
              [
                "Gap before changes",
                flow.fullyFundedRecurringGapBeforePlanMinor,
              ],
              ["Money redirected", actions.redirectedExistingAllocationMinor],
              ["Newly set aside", actions.newlyFundedAllocationsMinor],
              [
                "Spending stopped or reduced",
                actions.grossMonthlyReductionsMinor,
              ],
              [
                "Normal month after changes",
                actions.totalMonthlyOutgoingsAfterPlanMinor,
              ],
              ["Net plan improvement", actions.netMonthlyImprovementMinor],
              ["Monthly surplus", Math.max(0, actions.balanceAfterPlanMinor)],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-white p-5">
                <p className="text-xs text-[var(--faint)]">{label}</p>
                <p className="mt-2 font-mono text-lg font-semibold">
                  {formatMoney(Number(value))}
                </p>
              </div>
            ))}
          </div>
          <div className="border-t border-[var(--line)] px-5 py-4 text-xs leading-5 text-[var(--muted)]">
            <p>
              Before changes, fully covering the surprise-cost pot leaves the
              month short by{" "}
              {formatMoney(flow.fullyFundedRecurringGapBeforePlanMinor)}. The
              plan redirects{" "}
              {formatMoney(actions.redirectedExistingAllocationMinor)}
              already leaving for ordinary savings, newly sets aside only{" "}
              {formatMoney(actions.newlyFundedAllocationsMinor)}, and stops or
              reduces {formatMoney(actions.grossMonthlyReductionsMinor)} of
              other monthly spending.
            </p>
            <p className="mt-2 font-semibold text-[var(--sage-dark)]">
              The corrected normal month finishes{" "}
              {formatMoney(actions.balanceAfterPlanMinor)} ahead. That amount
              can repair the existing hole each month if every selected choice
              is confirmed and holds.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="One-off backlog" eyebrow="Balance to rebuild">
          <div className="grid gap-px bg-[var(--line)] sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Amount to get back to zero", backlog.amountToZeroMinor],
              ["Safety cushion to rebuild", backlog.cushionToRebuildMinor],
              ["Total one-off balance", backlog.totalBacklogMinor],
              ["Immediate July reduction", backlog.immediateReductionMinor],
              ["Remaining one-off backlog", backlog.remainingBacklogMinor],
              [
                "Monthly backlog capacity",
                backlog.monthlyReductionCapacityMinor,
              ],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-white p-5">
                <p className="text-xs text-[var(--faint)]">{label}</p>
                <p className="mt-2 font-mono text-lg font-semibold">
                  {formatMoney(Number(value))}
                </p>
              </div>
            ))}
          </div>
          <p className="border-t border-[var(--line)] px-5 py-4 text-sm leading-6">
            The {formatMoney(backlog.amountToZeroMinor)} timing low and{" "}
            {formatMoney(backlog.cushionToRebuildMinor)} cushion are one-off
            balance targets. They are not added to every month. After the July
            actions, {formatMoney(backlog.remainingBacklogMinor)} remains; the
            corrected plan can reduce it by{" "}
            {formatMoney(backlog.monthlyReductionCapacityMinor)} per month.
          </p>
        </SectionCard>

        <SectionCard
          title="Corrected monthly plan"
          eyebrow="One redirect plus five spending changes"
        >
          <div className="grid gap-px border-b border-[var(--line)] bg-[var(--line)] sm:grid-cols-3">
            {[
              ["Redirect choices", actions.redirectActionsSelectedCount],
              ["Spending changes", actions.spendingChangeActionsSelectedCount],
              ["Displayed plan lines", actions.totalDisplayedPlanLines],
            ].map(([label, value]) => (
              <div key={String(label)} className="bg-white px-5 py-4">
                <p className="text-xs text-[var(--faint)]">{label}</p>
                <p className="mt-1 font-mono text-lg font-semibold">{value}</p>
              </div>
            ))}
          </div>
          <div className="divide-y divide-[var(--line)]">
            {actions.selectedActions.map((change) => (
              <div key={change.actionId} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-3xl">
                    <p className="text-sm font-semibold">{change.title}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                      {change.reason}
                    </p>
                    {change.savingsRedirectDerivation ? (
                      <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                        Redirect{" "}
                        {formatMoney(
                          change.savingsRedirectDerivation
                            .redirectedToIrregularCostsMinor,
                        )}{" "}
                        to the surprise-cost pot. Only{" "}
                        {formatMoney(
                          change.savingsRedirectDerivation
                            .newlyRequiredForIrregularCostsMinor,
                        )}{" "}
                        then needs new room. This is temporary and requires you
                        to confirm the savings are accessible and unrestricted.
                      </p>
                    ) : null}
                    {change.categoryDerivation ? (
                      <dl className="mt-3 grid gap-2 text-xs sm:grid-cols-4">
                        <div>
                          <dt className="text-[var(--faint)]">Typical month</dt>
                          <dd className="font-mono">
                            {formatMoney(
                              change.categoryDerivation
                                .fullMonthTypicalSpendMinor,
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[var(--faint)]">
                            Flexible share
                          </dt>
                          <dd className="font-mono">
                            {coverage(
                              change.categoryDerivation
                                .flexibleShareBasisPoints,
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[var(--faint)]">
                            Protected floor
                          </dt>
                          <dd className="font-mono">
                            {formatMoney(
                              change.categoryDerivation
                                .protectedMonthlyFloorMinor,
                            )}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-[var(--faint)]">
                            Selected reduction
                          </dt>
                          <dd className="font-mono">
                            {formatMoney(change.monthlyReductionMinor)}
                          </dd>
                        </div>
                      </dl>
                    ) : null}
                    <p className="mt-2 text-[10px] uppercase tracking-[0.1em] text-[var(--faint)]">
                      {change.confidence} confidence · your confirmation
                      required
                    </p>
                  </div>
                  <p className="font-mono text-sm font-semibold text-[var(--sage-dark)]">
                    {change.kind === "savings_redirect" ? "↪" : "−"}
                    {formatMoney(change.selectedValueMinor)}/month
                  </p>
                </div>
              </div>
            ))}
            <div className="bg-[var(--canvas)] px-5 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-3xl">
                  <p className="text-sm font-semibold">
                    Fund irregular household costs
                  </p>
                  <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    This is a funded provision based on three complete months,
                    not a saving. Existing savings contributions cover{" "}
                    {formatMoney(actions.redirectedToIrregularCostsMinor)}; only{" "}
                    {formatMoney(actions.newlyFundedAllocationsMinor)} is new
                    monthly spending.
                  </p>
                </div>
                <p className="font-mono text-sm font-semibold text-[var(--rust)]">
                  +{formatMoney(actions.newlyFundedAllocationsMinor)}/month
                </p>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Other supported choices"
          eyebrow="Not in the five-item plan"
        >
          <div className="divide-y divide-[var(--line)]">
            {actions.candidates
              .filter((candidate) => !candidate.selected)
              .map((candidate) => (
                <div key={candidate.actionId} className="px-5 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="max-w-3xl">
                      <p className="text-sm font-semibold">{candidate.title}</p>
                      <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                        Rank {candidate.selectionRank}.{" "}
                        {candidate.exclusionExplanation}
                      </p>
                    </div>
                    <p className="font-mono text-sm font-semibold">
                      {formatMoney(candidate.monthlyReductionMinor)}/month
                    </p>
                  </div>
                </div>
              ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Your CFO coaching"
          eyebrow="Interpretation of the calculated plan"
        >
          <CfoBrief
            type="action_plan"
            initialNarrative={buildFallbackNarrative(
              cfo.narrativeFacts,
              "action_plan",
            )}
          />
        </SectionCard>

        <SectionCard
          title="If these changes hold"
          eyebrow="Conditional milestones"
        >
          <div className="divide-y divide-[var(--line)]">
            {plan.milestonesUnderPlan.map((milestone) => (
              <div key={milestone.id} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="max-w-3xl">
                    <p className="text-sm font-semibold">{milestone.title}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                      Monthly backlog reduction:{" "}
                      {formatMoney(milestone.monthlyBacklogReductionMinor)}.
                      Additional monthly improvement still required:{" "}
                      {formatMoney(
                        milestone.additionalMonthlyImprovementRequiredMinor,
                      )}
                      .
                    </p>
                  </div>
                  <p className="text-xs font-semibold text-[var(--rust)]">
                    {milestone.estimatedDate
                      ? formatDate(milestone.estimatedDate)
                      : "No supported date"}
                  </p>
                </div>
                {milestone.limitation ? (
                  <p className="mt-2 text-xs leading-5 text-[var(--rust)]">
                    {milestone.limitation}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard title="Debt effect" eyebrow="Stabilise first">
          <div className="p-5 text-sm leading-6">
            <p>{plan.debtEffect.limitation}</p>
            <p className="mt-2 text-[var(--muted)]">
              Keep every required minimum payment protected. The supported
              optional amount is{" "}
              {formatMoney(plan.debtEffect.safeOptionalPaymentMinor)} from{" "}
              {plan.debtEffect.optionalOverpaymentStartDate
                ? formatDate(plan.debtEffect.optionalOverpaymentStartDate)
                : "no supported date"}
              . If the assumptions hold, the current debt-free date of{" "}
              {plan.debtEffect.currentDebtFreeDate
                ? formatDate(plan.debtEffect.currentDebtFreeDate)
                : "unknown"}{" "}
              moves to{" "}
              {plan.debtEffect.revisedDebtFreeDate
                ? formatDate(plan.debtEffect.revisedDebtFreeDate)
                : "no supported revised date"}
              .
            </p>
          </div>
        </SectionCard>

        <SectionCard
          title="Can you afford a purchase?"
          eyebrow="Try a scenario"
        >
          <ScenarioSimulator
            beforeAction={cfo.forecast}
            afterAction={cfo.forecastAfterAction}
          />
        </SectionCard>
      </div>
    </>
  );
}
