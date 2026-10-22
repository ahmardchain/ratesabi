/** Atomic-unit + RAY helpers. All money amounts in Textile are strings in atomic units. */
export const RAY = 10n ** 27n;

/** Convert a human decimal string (e.g. "12.5") to atomic units for `decimals`. */
export function toAtomic(amount: string, decimals: number): string {
  if (!/^\d+(\.\d+)?$/.test(amount.trim())) throw new Error(`invalid amount: ${amount}`);
  const [whole, frac = ""] = amount.trim().split(".");
  if (frac.length > decimals) throw new Error(`too many decimal places for ${decimals} decimals`);
  const padded = frac.padEnd(decimals, "0");
  return (BigInt(whole) * 10n ** BigInt(decimals) + BigInt(padded || "0")).toString();
}

/** Convert atomic units back to a human decimal string. */
export function fromAtomic(atomic: string, decimals: number): string {
  const v = BigInt(atomic);
  const base = 10n ** BigInt(decimals);
  const whole = v / base;
  const frac = (v % base).toString().padStart(decimals, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : whole.toString();
}

/** Parse a RAY-scaled (1e27) rate string into a JS number. Rates are prices, precision loss beyond ~15 sig figs is acceptable for display/edge math. */
export function parseRay(ray: string): number {
  const v = BigInt(ray);
  const whole = v / RAY;
  const frac = Number(v % RAY) / 1e27;
  return Number(whole) + frac;
}

/** Format a RAY rate string with `dp` decimal places. */
export function formatRay(ray: string, dp = 4): string {
  return parseRay(ray).toFixed(dp);
}

/** Append an ERC-8021 attribution tag (hex, no 0x prefix needed) as a calldata suffix. Returns calldata unchanged if no tag. */
export function withAttributionTag(calldata: string, tag?: string | null): string {
  if (!tag) return calldata;
  const clean = tag.startsWith("0x") ? tag.slice(2) : tag;
  if (!/^[0-9a-fA-F]+$/.test(clean) || clean.length % 2 !== 0) throw new Error("ATTRIBUTION_TAG must be even-length hex");
  if (!calldata.startsWith("0x")) throw new Error("calldata must be 0x-prefixed");
  return calldata + clean.toLowerCase();
}

/** Edge of `quoteRate` over `benchmarkRate` in basis points (positive = quote is better for the seller of the base asset). */
export function edgeBps(quoteRate: number, benchmarkRate: number): number {
  if (benchmarkRate <= 0) throw new Error("benchmark rate must be > 0");
  return Math.round(((quoteRate - benchmarkRate) / benchmarkRate) * 10_000);
}

/** Effective human rate (buy units per 1 sell unit) computed from atomic amounts — the trustworthy
 * orientation. Textile's rateRay orientation varies by corridor, so decisions use this, not rateRay. */
export function effectiveRate(sellAtomic: string, buyAtomic: string, sellDecimals: number, buyDecimals: number): number {
  const sell = Number(BigInt(sellAtomic)) / 10 ** sellDecimals;
  const buy = Number(BigInt(buyAtomic)) / 10 ** buyDecimals;
  if (sell <= 0) throw new Error("sell amount must be > 0");
  return buy / sell;
}
