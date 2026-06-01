export const formatMoney = (value, currency = "USD") => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value || 0);
export const formatPercent = (value) => `${Number(value || 0).toFixed(1)}%`;
