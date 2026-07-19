"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatDate, formatMoney } from "@/src/lib/format";

export interface DebtPayoffChartPoint {
  date: string;
  currentBalanceMinor?: number;
  planBalanceMinor?: number;
}

function shortMonth(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function axisMoney(value: number) {
  const pounds = value / 100;
  return `£${(pounds / 1_000).toFixed(pounds >= 10_000 ? 0 : 1)}k`;
}

function PayoffLabel({
  viewBox,
  title,
  date,
  tone,
}: {
  viewBox?: { x?: number; y?: number };
  title: string;
  date: string;
  tone: string;
}) {
  const x = viewBox?.x ?? 0;
  const y = (viewBox?.y ?? 0) - 12;
  return (
    <text x={x} y={y} textAnchor="middle" fill={tone} fontSize={10}>
      <tspan x={x} fontWeight={700}>
        {title}
      </tspan>
      <tspan x={x} dy={13} fontWeight={600}>
        {formatDate(date)}
      </tspan>
    </text>
  );
}

export function DebtPayoffRoutesChart({
  points,
  currentPayoffDate,
  planPayoffDate,
}: {
  points: DebtPayoffChartPoint[];
  currentPayoffDate: string;
  planPayoffDate: string;
}) {
  const tickStep = Math.max(1, Math.floor(points.length / 6));
  const ticks = points
    .filter((_, index) => index % tickStep === 0)
    .map((point) => point.date);
  if (ticks.at(-1) !== points.at(-1)?.date && points.at(-1)) {
    ticks.push(points.at(-1)!.date);
  }

  return (
    <div className="min-w-0 px-3 pb-4 pt-5 sm:px-5">
      <div
        className="h-[330px] w-full sm:h-[380px]"
        role="img"
        aria-label={`Debt balance routes. The plan route ends ${formatDate(planPayoffDate)}, before the current route ends ${formatDate(currentPayoffDate)}.`}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={points}
            margin={{ top: 22, right: 28, bottom: 18, left: 6 }}
            accessibilityLayer
          >
            <CartesianGrid
              vertical={false}
              stroke="var(--line)"
              strokeDasharray="3 5"
            />
            <XAxis
              dataKey="date"
              ticks={ticks}
              tickFormatter={shortMonth}
              axisLine={{ stroke: "var(--line)" }}
              tickLine={false}
              tick={{ fill: "var(--muted)", fontSize: 10 }}
              minTickGap={18}
            />
            <YAxis
              domain={[0, "auto"]}
              tickFormatter={axisMoney}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted)", fontSize: 10 }}
              width={52}
            />
            <Tooltip
              cursor={{ stroke: "var(--faint)", strokeDasharray: "3 4" }}
              formatter={(value, name) => [formatMoney(Number(value)), name]}
              labelFormatter={(value) => formatDate(String(value))}
              contentStyle={{
                border: "1px solid var(--line)",
                borderRadius: "12px",
                boxShadow: "0 10px 30px rgb(32 36 31 / 0.08)",
                fontSize: "12px",
              }}
            />
            <Legend
              verticalAlign="top"
              align="left"
              iconType="plainline"
              wrapperStyle={{ fontSize: "11px", paddingBottom: "16px" }}
            />
            <ReferenceLine y={0} stroke="var(--line)" />
            <Line
              type="linear"
              dataKey="currentBalanceMinor"
              name="Current minimum-payment plan"
              stroke="var(--muted)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls={false}
              isAnimationActive={false}
            />
            <Line
              type="linear"
              dataKey="planBalanceMinor"
              name="Plan route"
              stroke="var(--sage-dark)"
              strokeWidth={3}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls={false}
              isAnimationActive={false}
            />
            <ReferenceDot
              x={planPayoffDate}
              y={0}
              r={5}
              fill="var(--sage-dark)"
              stroke="white"
              strokeWidth={2}
              label={
                <PayoffLabel
                  title="Plan ends"
                  date={planPayoffDate}
                  tone="var(--sage-dark)"
                />
              }
            />
            <ReferenceDot
              x={currentPayoffDate}
              y={0}
              r={5}
              fill="var(--muted)"
              stroke="white"
              strokeWidth={2}
              label={
                <PayoffLabel
                  title="Current route ends"
                  date={currentPayoffDate}
                  tone="var(--muted)"
                />
              }
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
