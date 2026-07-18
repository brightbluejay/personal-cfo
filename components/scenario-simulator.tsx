"use client";

import { useMemo, useState } from "react";
import type { CashForecast } from "@/src/domain/cfo/forecast";
import { simulatePurchase } from "@/src/domain/cfo/scenario";
import { formatMoney } from "@/src/lib/format";

export function ScenarioSimulator({
  beforeAction,
  afterAction,
}: {
  beforeAction: CashForecast;
  afterAction: CashForecast;
}) {
  const [pounds, setPounds] = useState("");
  const [date, setDate] = useState("");
  const amountMinor = Math.round((Number(pounds) || 0) * 100);
  const valid =
    amountMinor > 0 &&
    date >= afterAction.asOfDate &&
    date <= afterAction.monthEndDate;
  const result = useMemo(
    () =>
      valid
        ? simulatePurchase({ beforeAction, afterAction, amountMinor, date })
        : null,
    [afterAction, amountMinor, beforeAction, date, valid],
  );
  function shareWithBrief() {
    if (!result) return;
    window.dispatchEvent(
      new CustomEvent("personal-cfo:scenario", {
        detail: { amountMinor: result.amountMinor, date: result.date },
      }),
    );
  }
  const tone =
    result?.result === "safe"
      ? "text-[var(--sage-dark)]"
      : "text-[var(--rust)]";
  return (
    <div className="space-y-4 p-5">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium">
          Purchase amount
          <input
            aria-label="Purchase amount"
            inputMode="decimal"
            min="0.01"
            step="0.01"
            type="number"
            value={pounds}
            onChange={(event) => setPounds(event.target.value)}
            placeholder="0.00"
            className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2"
          />
        </label>
        <label className="text-sm font-medium">
          Purchase date
          <input
            aria-label="Purchase date"
            type="date"
            min={afterAction.asOfDate}
            max={afterAction.monthEndDate}
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="mt-2 w-full rounded-lg border border-[var(--line)] bg-white px-3 py-2"
          />
        </label>
      </div>
      {result ? (
        <div className="rounded-xl bg-[var(--canvas)] p-4">
          <p className={`text-sm font-semibold capitalize ${tone}`}>
            {result.result}
          </p>
          <p className="mt-2 text-sm text-[var(--muted)]">
            {result.explanation}
          </p>
          <div className="mt-4 grid gap-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-[var(--faint)]">Maximum safe</p>
              <p className="mt-1 font-mono font-semibold">
                {formatMoney(result.maximumSafeAmountMinor)}
              </p>
            </div>
            <div>
              <p className="text-[var(--faint)]">Before actions</p>
              <p className="mt-1 font-mono font-semibold">
                {formatMoney(result.beforeActionMonthEndMinor)}
              </p>
            </div>
            <div>
              <p className="text-[var(--faint)]">After actions</p>
              <p className="mt-1 font-mono font-semibold">
                {formatMoney(result.afterActionMonthEndMinor)}
              </p>
            </div>
            <div>
              <p className="text-[var(--faint)]">After purchase</p>
              <p className="mt-1 font-mono font-semibold">
                {formatMoney(result.afterPurchaseMonthEndMinor)}
              </p>
            </div>
          </div>
          <p className="mt-4 text-xs text-[var(--muted)]">
            Amount needed to restore the safety cushion after this purchase:{" "}
            {formatMoney(result.amountNeededToRestoreSafetyCushionMinor)}.
          </p>
          <button
            type="button"
            onClick={shareWithBrief}
            className="mt-4 rounded-lg border border-[var(--line)] bg-white px-3 py-2 text-xs font-semibold"
          >
            Explain this in the CFO brief
          </button>
        </div>
      ) : (
        <div className="rounded-xl bg-[var(--canvas)] p-4 text-sm text-[var(--muted)]">
          Enter a positive amount and a date this month to see the result.
        </div>
      )}
    </div>
  );
}
