"use client";

import {
  Area,
  CartesianGrid,
  Line,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  AreaChart,
} from "recharts";
import { formatMoney } from "@/src/lib/format";

export interface CashJourneyPoint {
  date: string;
  balanceMinor: number;
  positiveBalanceMinor: number;
  negativeBalanceMinor: number;
}

export interface CashJourneyKeyPoint {
  date: string;
  balanceMinor: number;
  label: string;
  labelPosition: "top" | "bottom";
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function axisMoney(value: number) {
  const pounds = value / 100;
  if (Math.abs(pounds) >= 1_000) {
    return `${pounds < 0 ? "−" : ""}£${Math.abs(pounds / 1_000).toFixed(1)}k`;
  }
  return `${pounds < 0 ? "−" : ""}£${Math.abs(Math.round(pounds))}`;
}

function KeyPointLabel({
  viewBox,
  value,
  position,
}: {
  viewBox?: { x?: number; y?: number };
  value: CashJourneyKeyPoint;
  position: "top" | "bottom";
}) {
  const x = viewBox?.x ?? 0;
  const y = viewBox?.y ?? 0;
  const direction = position === "top" ? -1 : 1;
  const amountY = y + direction * 18;
  const textAnchor = value.label === "Month end" ? "end" : "middle";
  const adjustedX = value.label === "Month end" ? x - 4 : x;

  return (
    <text
      x={adjustedX}
      y={amountY}
      textAnchor={textAnchor}
      fill="var(--ink)"
      fontSize={11}
      fontWeight={700}
    >
      <tspan x={adjustedX}>{formatMoney(value.balanceMinor)}</tspan>
      <tspan
        x={adjustedX}
        dy={direction * 14}
        fill="var(--muted)"
        fontSize={10}
        fontWeight={500}
      >
        {shortDate(value.date)}
      </tspan>
    </text>
  );
}

export function CashJourneyChart({
  points,
  keyPoints,
}: {
  points: CashJourneyPoint[];
  keyPoints: CashJourneyKeyPoint[];
}) {
  const values = points.map((point) => point.balanceMinor);
  const maximum = Math.max(...values, 0);
  const minimum = Math.min(...values, 0);
  const padding = Math.max(20_000, Math.round((maximum - minimum) * 0.18));

  return (
    <div className="min-w-0 px-3 pb-2 pt-5 sm:px-5">
      <div
        className="h-[330px] w-full sm:h-[360px]"
        role="img"
        aria-label="Dated cash journey showing the current balance, the projected low below zero, the recovery after salary, and the expected month-end balance."
      >
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={points}
            margin={{ top: 48, right: 22, bottom: 18, left: 4 }}
            accessibilityLayer
          >
            <defs>
              <linearGradient id="cash-positive" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--sage)" stopOpacity={0.55} />
                <stop
                  offset="100%"
                  stopColor="var(--sage)"
                  stopOpacity={0.08}
                />
              </linearGradient>
              <linearGradient id="cash-negative" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--rust)" stopOpacity={0.16} />
                <stop
                  offset="100%"
                  stopColor="var(--rust)"
                  stopOpacity={0.58}
                />
              </linearGradient>
            </defs>
            <CartesianGrid
              vertical={false}
              stroke="var(--line)"
              strokeDasharray="3 5"
            />
            <XAxis
              dataKey="date"
              ticks={keyPoints.map((point) => point.date)}
              tickFormatter={shortDate}
              axisLine={{ stroke: "var(--line)" }}
              tickLine={false}
              tick={{ fill: "var(--muted)", fontSize: 10 }}
              minTickGap={18}
            />
            <YAxis
              domain={[minimum - padding, maximum + padding]}
              tickFormatter={axisMoney}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted)", fontSize: 10 }}
              width={48}
            />
            <Tooltip
              cursor={{ stroke: "var(--faint)", strokeDasharray: "3 4" }}
              formatter={(value) => [formatMoney(Number(value)), "Balance"]}
              labelFormatter={(value) => shortDate(String(value))}
              contentStyle={{
                border: "1px solid var(--line)",
                borderRadius: "12px",
                boxShadow: "0 10px 30px rgb(32 36 31 / 0.08)",
                fontSize: "12px",
              }}
            />
            <ReferenceLine
              y={0}
              stroke="var(--ink)"
              strokeWidth={1.5}
              label={{
                value: "£0",
                position: "insideLeft",
                fill: "var(--ink)",
                fontSize: 10,
              }}
            />
            <Area
              type="linear"
              dataKey="positiveBalanceMinor"
              baseValue={0}
              stroke="none"
              fill="url(#cash-positive)"
              isAnimationActive={false}
              name="Positive balance"
            />
            <Area
              type="linear"
              dataKey="negativeBalanceMinor"
              baseValue={0}
              stroke="none"
              fill="url(#cash-negative)"
              isAnimationActive={false}
              name="Below zero"
            />
            <Line
              type="linear"
              dataKey="balanceMinor"
              stroke="var(--ink)"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: "var(--ink)" }}
              isAnimationActive={false}
              name="Balance"
            />
            {keyPoints.map((point) => (
              <ReferenceDot
                key={point.label}
                x={point.date}
                y={point.balanceMinor}
                r={5}
                fill={
                  point.balanceMinor < 0 ? "var(--rust)" : "var(--sage-dark)"
                }
                stroke="white"
                strokeWidth={2}
                label={
                  <KeyPointLabel value={point} position={point.labelPosition} />
                }
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-2 px-2 text-[10px] font-semibold uppercase tracking-[0.08em] text-[var(--muted)]">
        <span className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-sm bg-[var(--rust)]" />
          Below zero
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-5 bg-[var(--ink)]" />
          Projected balance
        </span>
      </div>
    </div>
  );
}
