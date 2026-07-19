"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney } from "@/src/lib/format";

function axisMoney(value: number) {
  return `£${Math.round(value / 100)}`;
}

export function PlanCompositionChart({
  redirectedMinor,
  reductionsMinor,
  existingGapMinor,
  surpriseCostPotMinor,
  surplusMinor,
}: {
  redirectedMinor: number;
  reductionsMinor: number;
  existingGapMinor: number;
  surpriseCostPotMinor: number;
  surplusMinor: number;
}) {
  const data = [
    {
      label: "Money found",
      redirected: redirectedMinor,
      reductions: reductionsMinor,
      existingGap: 0,
      surprisePot: 0,
      surplus: 0,
    },
    {
      label: "Monthly plan",
      redirected: 0,
      reductions: 0,
      existingGap: existingGapMinor,
      surprisePot: surpriseCostPotMinor,
      surplus: surplusMinor,
    },
  ];
  const legend = [
    ["Redirected", redirectedMinor, "bg-[var(--sage)]"],
    ["Stopped or reduced", reductionsMinor, "bg-[var(--sage-dark)]"],
    ["Existing monthly gap", existingGapMinor, "bg-[var(--panel)]"],
    ["Surprise-cost pot", surpriseCostPotMinor, "bg-[var(--faint)]"],
    ["Monthly surplus", surplusMinor, "bg-[var(--ink)]"],
  ] as const;

  return (
    <div className="border-b border-[var(--line)] px-3 py-5 sm:px-5">
      <div
        className="h-[190px] w-full"
        role="img"
        aria-label={`Monthly plan composition: ${formatMoney(redirectedMinor)} redirected plus ${formatMoney(reductionsMinor)} stopped or reduced covers the ${formatMoney(existingGapMinor)} existing monthly gap, sets aside ${formatMoney(surpriseCostPotMinor)} for surprise costs, and leaves ${formatMoney(surplusMinor)}.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 4, right: 12, bottom: 4, left: 6 }}
            accessibilityLayer
          >
            <CartesianGrid
              horizontal={false}
              stroke="var(--line)"
              strokeDasharray="3 5"
            />
            <XAxis
              type="number"
              tickFormatter={axisMoney}
              axisLine={{ stroke: "var(--line)" }}
              tickLine={false}
              tick={{ fill: "var(--muted)", fontSize: 10 }}
            />
            <YAxis
              type="category"
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--ink)", fontSize: 11, fontWeight: 600 }}
              width={92}
            />
            <Tooltip
              formatter={(value, name) => [
                formatMoney(Number(value)),
                String(name),
              ]}
              cursor={{ fill: "rgb(229 238 225 / 0.35)" }}
              contentStyle={{
                border: "1px solid var(--line)",
                borderRadius: "12px",
                boxShadow: "0 10px 30px rgb(32 36 31 / 0.08)",
                fontSize: "12px",
              }}
            />
            <Bar
              dataKey="redirected"
              name="Redirected"
              stackId="plan"
              fill="var(--sage)"
              isAnimationActive={false}
            />
            <Bar
              dataKey="reductions"
              name="Stopped or reduced"
              stackId="plan"
              fill="var(--sage-dark)"
              isAnimationActive={false}
            />
            <Bar
              dataKey="existingGap"
              name="Existing monthly gap"
              stackId="plan"
              fill="var(--panel)"
              isAnimationActive={false}
            />
            <Bar
              dataKey="surprisePot"
              name="Surprise-cost pot"
              stackId="plan"
              fill="var(--faint)"
              isAnimationActive={false}
            />
            <Bar
              dataKey="surplus"
              name="Monthly surplus"
              stackId="plan"
              fill="var(--ink)"
              radius={[0, 5, 5, 0]}
              isAnimationActive={false}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        {legend.map(([label, amount, colour]) => (
          <div key={label} className="flex items-start gap-2 text-xs">
            <span
              className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-sm ${colour}`}
            />
            <span>
              <span className="block text-[var(--muted)]">{label}</span>
              <span className="font-mono font-semibold">
                {formatMoney(amount)}
              </span>
            </span>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs leading-5 text-[var(--muted)]">
        The redirected amount funds most of the surprise-cost pot rather than
        being counted twice. The two bars reconcile to the same monthly total.
      </p>
    </div>
  );
}
