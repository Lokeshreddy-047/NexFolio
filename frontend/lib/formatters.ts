/**
 * NexFolio Institutional Financial Math & Formatter Utilities
 */

export function formatINR(num: number, maximumFractionDigits: number = 0): string {
  if (isNaN(num)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits,
  }).format(num);
}

export function formatPercentage(num: number, decimals: number = 2): string {
  if (isNaN(num)) return "0.00%";
  const sign = num > 0 ? "+" : "";
  return `${sign}${num.toFixed(decimals)}%`;
}

export function calculateRealizedPnL(
  sellQty: number,
  sellPrice: number,
  costBasisPerShare: number
): { pnl: number; pnlPct: number } {
  const proceeds = sellQty * sellPrice;
  const cost = sellQty * costBasisPerShare;
  const pnl = proceeds - cost;
  const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0.0;
  return {
    pnl: Math.round(pnl * 100) / 100,
    pnlPct: Math.round(pnlPct * 100) / 100,
  };
}

export function calculateEffectiveTax(
  stcg: number,
  ltcgAboveThreshold: number,
  stcgRate: number = 0.20,
  ltcgRate: number = 0.125,
  cessRate: number = 0.04
): { baseTax: number; cess: number; totalTax: number } {
  const baseTax = Math.max(0, stcg) * stcgRate + Math.max(0, ltcgAboveThreshold) * ltcgRate;
  const cess = baseTax * cessRate;
  return {
    baseTax: Math.round(baseTax * 100) / 100,
    cess: Math.round(cess * 100) / 100,
    totalTax: Math.round((baseTax + cess) * 100) / 100,
  };
}
