/**
 * Textile FX API v2 client — https://fx-docs.textilecredit.com/api/v2/rfq.html
 * Base: https://api.textilecredit.com/v2
 * Responses are enveloped: { data: { ... } }. Rates are `rateRay` (RAY, 1e27).
 * Non-custodial: Textile returns signed orders + calldata in transactions.swap; the taker
 * approves `quote.takerPays` to `quote.reactor`, signs and broadcasts with their own wallet.
 */
const BASE = process.env.TEXTILE_API_BASE ?? "https://api.textilecredit.com/v2";

export const CELO_CHAIN_ID = 42220;
/** Verified Celo mainnet token addresses (from Textile /rfq/levels, 2026-10-22). */
export const CELO_TOKENS: Record<string, { address: string; decimals: number }> = {
  USDT: { address: "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e", decimals: 6 },
  cNGN: { address: "0xf6829d7393dae24509eb1e52ee8e572e2e271a4f", decimals: 6 },
  USDC: { address: "0xceba9300f2b948710d2653dd7b07f33a8b32118c", decimals: 6 },
  wARS: { address: "0x0dc4f92879b7670e5f4e4e6e3c801d229129d90d", decimals: 18 },
  wBRL: { address: "0xd76f5faf6888e24d9f04bf92a0c8b921fe4390e0", decimals: 18 },
  IDRX: { address: "0x18bc5bcc660cf2b9ce3cd51a404afe1a0cbd3c22", decimals: 2 },
};
export function resolveToken(t: string): string { return CELO_TOKENS[t]?.address ?? t; }
export const CORRIDORS = [
  { pair: "cNGN/USDT", sell: "cNGN", buy: "USDT" },
  { pair: "USDT/cNGN", sell: "USDT", buy: "cNGN" },
  { pair: "USDC/USDT", sell: "USDC", buy: "USDT" },
  { pair: "wARS/USDT", sell: "wARS", buy: "USDT" },
  { pair: "wBRL/USDT", sell: "wBRL", buy: "USDT" },
] as const;

export interface RfqPreviewRequest {
  chainId: number; sellToken: string; buyToken: string;
  sellAmount?: string; buyAmount?: string; // atomic-unit strings; exactly one
}
export interface QuoteCore {
  sellAmount: string; buyAmount: string; feeAmount?: string; takerPays?: string;
  rateRay: string; expiresAt?: string; orderDeadline?: string; reactor?: string;
  orders?: unknown[];
}
export interface RfqPreview extends QuoteCore { status: "preview" | "no_quote"; availableSellAmount?: string; reason?: string; }
export interface FirmQuote {
  rfqId: string; claimToken?: string;
  status: "quoted" | "no_quote" | string; reason?: string;
  quote?: QuoteCore;
  transactions?: { approval?: { to: string; data: string; value?: string }; swap?: { to: string; data: string; value?: string; attributionSuffix?: string | null } };
}

async function req<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers: Record<string, string> = { "content-type": "application/json", ...((init.headers as Record<string, string>) ?? {}) };
  if (process.env.TEXTILE_API_KEY) headers.authorization = `Bearer ${process.env.TEXTILE_API_KEY}`;
  const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 80_000); // docs: set client timeout to 75s+
  try {
    const res = await fetch(`${BASE}${path}`, { ...init, headers, signal: ctrl.signal });
    if (!res.ok) { const body = await res.text().catch(() => ""); throw new Error(`Textile ${path} failed: ${res.status} ${body.slice(0, 300)}`); }
    const json = (await res.json()) as { data?: T } | T;
    return (json as { data?: T }).data ?? (json as T);
  } finally { clearTimeout(t); }
}

/** Indicative price, nothing solicited or reserved. Free, no taker needed. */
export async function preview(body: RfqPreviewRequest): Promise<RfqPreview> {
  return req<RfqPreview>("/rfq/preview", { method: "POST", body: JSON.stringify(body) });
}
/** Per-pair price ladder for aggregators. Free, unlocked. */
export async function levels(pair?: string): Promise<unknown> {
  return req(`/rfq/levels${pair ? `?pair=${encodeURIComponent(pair)}` : ""}`);
}

export interface RequestQuoteInput extends RfqPreviewRequest {
  taker: string;
  /** EIP-712 TakerControl proof object for the keyless path. Required on first firm request when no API key. */
  takerProof?: { nonce: string; issuedAt: number; signature: string; scheme?: string };
  /** Ask Textile to end transactions.swap.data with an ERC-8021 attribution tag carrying your builder code(s). Preferred over appending a suffix yourself — indexers read only the last tag. */
  includeAttribution?: boolean; builderCodes?: string[];
}
/** Firm quote: signed orders + calldata, 60s TTL cap. API key replaces the taker signature. */
export async function requestQuote(input: RequestQuoteInput): Promise<FirmQuote> {
  if (!process.env.TEXTILE_API_KEY && !input.takerProof) throw new Error("requestQuote needs TEXTILE_API_KEY or a signed takerProof (keyless TakerControl path)");
  return req<FirmQuote>("/rfq/request", { method: "POST", body: JSON.stringify(input) });
}

export function isQuoteExpired(q: FirmQuote, now = Date.now()): boolean {
  const exp = q.quote?.expiresAt; if (!exp) return false;
  return new Date(exp).getTime() <= now;
}
function claimHeaders(claimToken?: string): Record<string, string> { return claimToken ? { "X-Rfq-Claim": claimToken } : {}; }
export async function submitTxHash(id: string, txHash: string, claimToken?: string): Promise<unknown> {
  return req(`/rfq/${encodeURIComponent(id)}/submit`, { method: "POST", body: JSON.stringify({ txHash }), headers: claimHeaders(claimToken) });
}
export async function quoteStatus(id: string, claimToken?: string): Promise<unknown> {
  return req(`/rfq/${encodeURIComponent(id)}`, { headers: claimHeaders(claimToken) });
}
export async function cancelQuote(id: string, claimToken?: string): Promise<unknown> {
  return req(`/rfq/${encodeURIComponent(id)}/cancel`, { method: "POST", body: "{}", headers: claimHeaders(claimToken) });
}
