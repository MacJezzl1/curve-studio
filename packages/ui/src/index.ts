/**
 * Shared UI design tokens, color utilities, and formatters for Curve Studio
 */

export const METEORA_PALETTE = {
  primary: "#22d3ee", // Meteora cyan
  secondary: "#c084fc", // Purple
  accent: "#38bdf8", // Sky blue
  darkBg: "#030712",
  cardBg: "#0f172a",
  border: "#1e293b",
  success: "#34d399",
  warning: "#fbbf24",
  danger: "#f87171",
};

export function formatSol(lamportsOrSol: number | string, decimals = 4): string {
  const num = typeof lamportsOrSol === "string" ? parseFloat(lamportsOrSol) : lamportsOrSol;
  if (isNaN(num)) return "0.00";
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: decimals,
  });
}

export function formatPrice(price: number, minDecimals = 4, maxDecimals = 8): string {
  if (price === 0) return "0.00";
  if (price < 0.0001) {
    return price.toExponential(3);
  }
  return price.toLocaleString(undefined, {
    minimumFractionDigits: minDecimals,
    maximumFractionDigits: maxDecimals,
  });
}

export function formatPercent(pct: number, decimals = 2): string {
  return `${pct.toFixed(decimals)}%`;
}
