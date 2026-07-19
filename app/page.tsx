import { CfoBrief } from "@/components/cfo-brief";
import {
  CashJourneyChart,
  type CashJourneyKeyPoint,
  type CashJourneyPoint,
} from "@/components/cash-journey-chart";
import {
  EmptyState,
  PageHeader,
  SectionCard,
  StatCard,
  StatusPill,
} from "@/components/ui";
import { getCfoWorkspace } from "@/src/db/cfo-query";
import type { CashForecast } from "@/src/domain/cfo/forecast";
import { buildFallbackNarrative } from "@/src/domain/cfo/narrative-output";
import { formatDate, formatMoney, formatMonth } from "@/src/lib/format";

export const dynamic = "force-dynamic";

function healthLabel(value: string) {
  return value.replaceAll("_", " ");
}

function addDay(value: string) {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
}

function buildCashJourneyPoints(forecast: CashForecast): CashJourneyPoint[] {
  const changesByDate = new Map<string, number>();
  for (const event of forecast.events) {
    changesByDate.set(
      event.date,
      (changesByDate.get(event.date) ?? 0) + event.amountMinor,
    );
  }
  const points: CashJourneyPoint[] = [];
  let balanceMinor = forecast.accessibleCashMinor;
  for (
    let date = forecast.asOfDate;
    date <= forecast.monthEndDate;
    date = addDay(date)
  ) {
    if (date !== forecast.asOfDate) {
      balanceMinor += changesByDate.get(date) ?? 0;
    }
    points.push({
      date,
      balanceMinor,
      positiveBalanceMinor: Math.max(0, balanceMinor),
      negativeBalanceMinor: Math.min(0, balanceMinor),
    });
  }
  return points;
}

export default function OverviewPage() {
  const cfo = getCfoWorkspace();
  if (!cfo) {
    return (
      <>
        <PageHeader
          eyebrow="Overview"
          title="Your financial position"
          description="Reset the demo data to calculate this month's position."
        />
        <SectionCard title="No monthly position available">
          <EmptyState>The demonstration data has not been loaded.</EmptyState>
        </SectionCard>
      </>
    );
  }
  const forecast = cfo.forecast;
  const nextIncome = forecast.nextIncome;
  const incomeName = nextIncome?.incomeType === "salary" ? "salary" : "income";
  const month = formatMonth(forecast.monthEndDate);
  const headline =
    forecast.projectedOverdraftMinor > 0
      ? `You will reach ${formatMoney(forecast.projectedOverdraftMinor)} overdrawn before your next ${incomeName}.`
      : `Your cash flow stays above zero through ${month}.`;
  const description = nextIncome
    ? `Your confirmed ${formatMoney(nextIncome.amountMinor)} ${incomeName} arrives on ${formatDate(nextIncome.date)} and lifts the account to ${formatMoney(nextIncome.balanceAfterMinor)}, but ${formatMoney(nextIncome.negativeBalanceClearedMinor)}—${Math.round(nextIncome.negativeBalanceClearedBasisPoints / 100)}%—is used clearing the earlier negative balance.`
    : "No future confirmed income is recorded in this month's dated forecast.";
  const allocation = nextIncome
    ? ([
        ["Clears the negative balance", nextIncome.negativeBalanceClearedMinor],
        [
          "Income allocated to confirmed commitments",
          nextIncome.commitmentsAfterIncomeMinor,
        ],
        [
          "Income allocated to protected debt payments",
          nextIncome.protectedDebtPaymentsAfterIncomeMinor,
        ],
        [
          "Income allocated to usual spending",
          nextIncome.remainingSpendingMinor,
        ],
        [
          "Income allocated to the safety cushion",
          nextIncome.safetyCushionAllocationMinor,
        ],
        ["Genuinely unallocated", nextIncome.genuinelyUnallocatedMinor],
      ] as const)
    : [];
  const cashJourneyKeyPoints: CashJourneyKeyPoint[] = [
    {
      label: "Current",
      date: forecast.asOfDate,
      balanceMinor: forecast.accessibleCashMinor,
      labelPosition: "top",
    },
    {
      label: "Low",
      date: forecast.lowestProjectedBalanceDate,
      balanceMinor: forecast.lowestProjectedBalanceMinor,
      labelPosition: "bottom",
    },
    ...(nextIncome
      ? [
          {
            label: `After ${incomeName}`,
            date: nextIncome.date,
            balanceMinor: nextIncome.balanceAfterMinor,
            labelPosition: "top" as const,
          },
        ]
      : []),
    {
      label: "Month end",
      date: forecast.monthEndDate,
      balanceMinor: forecast.projectedMonthEndBalanceMinor,
      labelPosition: "top",
    },
  ];
  return (
    <>
      <PageHeader
        eyebrow={`${month} cash-flow risk`}
        title={headline}
        description={description}
        action={
          <StatusPill tone="warn">
            {healthLabel(forecast.financialHealth)}
          </StatusPill>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Current accessible cash"
          value={formatMoney(forecast.accessibleCashMinor)}
          detail={`Position on ${formatDate(forecast.asOfDate)}`}
        />
        <StatCard
          label="Lowest expected balance"
          value={formatMoney(forecast.lowestProjectedBalanceMinor)}
          detail={`${formatDate(forecast.lowestProjectedBalanceDate)} · ${forecast.daysBelowZero} days below zero`}
          tone="rust"
        />
        <StatCard
          label="Expected month-end"
          value={formatMoney(forecast.projectedMonthEndBalanceMinor)}
          detail={`After confirmed income, obligations and usual spending through ${formatDate(forecast.monthEndDate)}`}
        />
        <StatCard
          label="Safe to spend now"
          value={formatMoney(forecast.safeToSpendNowMinor)}
          detail="Optional spending stays at zero while any projected balance is negative"
          tone="sage"
        />
      </div>

      <SectionCard
        title="Now → next income → month end"
        eyebrow="Dated cash journey"
        className="mt-6"
      >
        <CashJourneyChart
          points={buildCashJourneyPoints(forecast)}
          keyPoints={cashJourneyKeyPoints}
        />
        <div className="grid gap-px bg-[var(--line)] md:grid-cols-4">
          <div className="bg-white p-5">
            <p className="text-xs text-[var(--faint)]">
              Now · {formatDate(forecast.asOfDate)}
            </p>
            <p className="mt-2 font-mono text-xl font-semibold">
              {formatMoney(forecast.accessibleCashMinor)}
            </p>
          </div>
          <div className="bg-[var(--rust-pale)] p-5">
            <p className="text-xs text-[var(--rust)]">
              Low · {formatDate(forecast.lowestProjectedBalanceDate)}
            </p>
            <p className="mt-2 font-mono text-xl font-semibold text-[var(--rust)]">
              {formatMoney(forecast.lowestProjectedBalanceMinor)}
            </p>
          </div>
          <div className="bg-white p-5">
            <p className="text-xs text-[var(--faint)]">
              After {incomeName} · {formatDate(nextIncome?.date ?? null)}
            </p>
            <p className="mt-2 font-mono text-xl font-semibold">
              {nextIncome
                ? formatMoney(nextIncome.balanceAfterMinor)
                : "Not recorded"}
            </p>
            {nextIncome ? (
              <p className="mt-1 text-xs text-[var(--muted)]">
                Before: {formatMoney(nextIncome.balanceBeforeMinor)}
              </p>
            ) : null}
          </div>
          <div className="bg-white p-5">
            <p className="text-xs text-[var(--faint)]">
              Month end · {formatDate(forecast.monthEndDate)}
            </p>
            <p className="mt-2 font-mono text-xl font-semibold">
              {formatMoney(forecast.projectedMonthEndBalanceMinor)}
            </p>
          </div>
        </div>
        <p className="border-t border-[var(--line)] px-5 py-3 text-xs text-[var(--muted)]">
          Health rule: {forecast.financialHealthRule}
        </p>
      </SectionCard>

      {nextIncome ? (
        <SectionCard
          title={`Where the next ${incomeName} goes`}
          className="mt-6"
        >
          <div className="grid gap-px bg-[var(--line)] sm:grid-cols-2 xl:grid-cols-3">
            {allocation.map(([label, amount]) => (
              <div key={label} className="bg-white p-5">
                <p className="text-xs text-[var(--faint)]">{label}</p>
                <p className="mt-2 font-mono text-lg font-semibold">
                  {formatMoney(amount)}
                </p>
              </div>
            ))}
          </div>
          <p className="border-t border-[var(--line)] px-5 py-3 text-xs text-[var(--muted)]">
            These buckets reconcile to the confirmed income and do not count
            transfers, commitments or the safety cushion twice. The required
            cushion is {formatMoney(nextIncome.safetyCushionRequirementMinor)}.
          </p>
        </SectionCard>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <SectionCard title="What is making this month difficult">
          <div className="divide-y divide-[var(--line)]">
            {cfo.diagnosis.drivers.slice(0, 3).map((driver) => (
              <div key={driver.id} className="px-5 py-4">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-sm font-semibold">{driver.title}</p>
                  {driver.amountMinor > 0 ? (
                    <span className="font-mono text-sm font-semibold">
                      {formatMoney(driver.amountMinor)}
                    </span>
                  ) : null}
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  {driver.explanation}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
        <SectionCard title="What to do now" className="border-[var(--sage)]">
          <div className="divide-y divide-[var(--line)]">
            {cfo.recovery.actions.map((action) => (
              <div key={action.id} className="px-5 py-4">
                <div className="flex items-baseline justify-between gap-4">
                  <p className="text-sm font-semibold">{action.title}</p>
                  <span className="font-mono text-sm font-semibold text-[var(--sage-dark)]">
                    +{formatMoney(action.improvementMinor)}
                  </span>
                </div>
                <p className="mt-1 text-xs leading-5 text-[var(--muted)]">
                  {action.explanation}
                </p>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard
        title="CFO brief"
        eyebrow="Calculated facts, concise interpretation"
        className="mt-6"
      >
        <CfoBrief
          type="cfo_brief"
          initialNarrative={buildFallbackNarrative(
            cfo.narrativeFacts,
            "cfo_brief",
          )}
        />
      </SectionCard>
    </>
  );
}
