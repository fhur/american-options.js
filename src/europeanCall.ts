import { binomialCoefficient } from "./binomialCoefficient";

export function europeanCall({
  interestRate: r,
  years: t,
  numberOfPeriods: n,
  spotPrice: S,
  strikePrice: K,
  volatility: σ,
}: {
  interestRate: number;
  years: number;
  numberOfPeriods: number;
  spotPrice: number;
  strikePrice: number;
  volatility: number;
}) {
  const factor1 = Math.pow(1 / (1 + (r * t) / n), n);

  const u = Math.exp(σ * Math.sqrt(t / n));
  const d = 1 / u;

  const p = (1 + (r * t) / n - d) / (u - d);

  let sum = 0;
  for (let j = 0; j <= n; j++) {
    sum +=
      binomialCoefficient(n, j) *
      Math.pow(p, j) *
      Math.pow(1 - p, n - j) *
      Math.max(S * Math.pow(u, j) * Math.pow(d, n - j) - K, 0);
  }

  return factor1 * sum;
}
