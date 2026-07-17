export function formatMoney(minor: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    minimumFractionDigits: 2,
  }).format(minor / 100);
}

export function formatDate(value: string | null) {
  if (!value) return "Not scheduled";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

export function formatApr(basisPoints: number) {
  return `${(basisPoints / 100).toFixed(2)}%`;
}
