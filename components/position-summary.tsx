import type { CashForecast } from "@/src/domain/cfo/forecast";
import { formatMoney } from "@/src/lib/format";
import { StatCard } from "./ui";

export function PositionSummary({ forecast }: { forecast: CashForecast }) {
  return (
    <div className="mb-6 grid gap-4 sm:grid-cols-3">
      <StatCard
        label="Expected month-end balance"
        value={formatMoney(forecast.projectedMonthEndBalanceMinor)}
        detail="After confirmed payments and recent usual spending"
      />
      <StatCard
        label="Lowest expected balance"
        value={formatMoney(forecast.lowestProjectedBalanceMinor)}
        detail="The lowest point before month end"
        tone={forecast.projectedOverdraftMinor > 0 ? "rust" : "plain"}
      />
      <StatCard
        label="Safe to spend now"
        value={formatMoney(forecast.safeToSpendNowMinor)}
        detail="Without overdraft or using the safety cushion"
        tone="sage"
      />
    </div>
  );
}
