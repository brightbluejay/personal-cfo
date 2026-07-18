import type { SpendingAnomaly } from "./baseline";
import type { FundingEnvelopeInsight } from "./envelopes";
import type { CashForecast } from "./forecast";
import type { TransferGroup } from "./types";

function displayCategory(slug: string) {
  const value = slug.replaceAll("-", " ");
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export interface CfoDriver {
  id: string;
  kind:
    | "cash_pressure"
    | "spending_anomaly"
    | "one_off"
    | "envelope"
    | "transfer_uncertainty";
  amountMinor: number;
  title: string;
  explanation: string;
  evidenceIds: string[];
}

export interface CfoDiagnosis {
  status: CashForecast["status"];
  headline: string;
  forecast: CashForecast;
  drivers: CfoDriver[];
}

export function buildCfoDiagnosis(input: {
  forecast: CashForecast;
  billsBeforeIncomeMinor: number;
  anomalies: SpendingAnomaly[];
  envelopes: FundingEnvelopeInsight[];
  transfers: TransferGroup[];
  oneOffTransactions: Array<{
    id: string;
    amountMinor: number;
    description: string;
  }>;
}): CfoDiagnosis {
  const drivers: CfoDriver[] = [];
  if (input.billsBeforeIncomeMinor > 0) {
    drivers.push({
      id: "bills-before-income",
      kind: "cash_pressure",
      amountMinor: input.billsBeforeIncomeMinor,
      title: "Bills are due before the next income",
      explanation:
        "The timing of confirmed payments creates the lowest point in this month's forecast.",
      evidenceIds: [],
    });
  }
  for (const anomaly of input.anomalies) {
    drivers.push({
      id: `anomaly-${anomaly.categorySlug}`,
      kind: "spending_anomaly",
      amountMinor: anomaly.changeMinor,
      title: `${displayCategory(anomaly.categorySlug)} is higher than usual`,
      explanation: anomaly.explanation,
      evidenceIds: [],
    });
  }
  for (const transaction of input.oneOffTransactions) {
    drivers.push({
      id: `one-off-${transaction.id}`,
      kind: "one_off",
      amountMinor: Math.abs(transaction.amountMinor),
      title: "Unavoidable one-off cost",
      explanation: transaction.description,
      evidenceIds: [`transaction:${transaction.id}`],
    });
  }
  for (const envelope of input.envelopes.filter(
    (item) => item.exceededMinor > 0,
  )) {
    drivers.push({
      id: `envelope-${envelope.accountId}`,
      kind: "envelope",
      amountMinor: envelope.exceededMinor,
      title: "Spending account funding has been exceeded",
      explanation:
        "Eligible purchases made from another account after the spending account ran out are included once.",
      evidenceIds: envelope.evidenceIds,
    });
  }
  for (const transfer of input.transfers.filter(
    (group) => group.status !== "matched",
  )) {
    drivers.push({
      id: `transfer-${transfer.id}`,
      kind: "transfer_uncertainty",
      amountMinor: 0,
      title: "Transfer evidence needs confirmation",
      explanation: transfer.explanation,
      evidenceIds: transfer.evidence.map((item) => item.id),
    });
  }
  const headline =
    input.forecast.projectedMonthEndBalanceMinor >= 0
      ? "The month is projected to finish above zero, but payment timing still matters."
      : "The month is projected to finish overdrawn without a change.";
  return {
    status: input.forecast.status,
    headline,
    forecast: input.forecast,
    drivers: drivers.sort(
      (left, right) => right.amountMinor - left.amountMinor,
    ),
  };
}
