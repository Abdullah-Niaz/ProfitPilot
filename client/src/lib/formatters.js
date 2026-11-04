export const formatMoney = (value, currency = "USD") =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(value || 0);

export const formatCents = (cents, currency = "USD") =>
  formatMoney((cents || 0) / 100, currency);

export const formatPercent = (value) =>
  `${Number(value || 0).toFixed(1)}%`;

export const formatDate = (dateStr) => {
  if (!dateStr) return "-";
  try {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
};
