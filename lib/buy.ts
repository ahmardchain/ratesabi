/**
 * buy (usebuy.ai) gateway client — pay-per-request services for agents on Celo.
 * LIVE mode requires BUY_WALLET_KEY: x402 payments are signed with that wallet.
 * If it is not configured, paidCall() throws. It NEVER returns a fabricated result.
 */
const GATEWAY = process.env.BUY_GATEWAY_BASE ?? "https://gateway.usebuy.ai";

export interface PaymentSigner {
  /** Returns the x402 PAYMENT-SIGNATURE header value for a 402 challenge. */
  signPayment(challenge: unknown, maxAmountUsd: number): Promise<string>;
}

/** Stub signer: real EIP-3009 signing is wired once Ahmard approves the agent wallet. */
export function envPaymentSigner(): PaymentSigner {
  const key = process.env.BUY_WALLET_KEY;
  if (!key) throw new Error("live buy calls not configured: BUY_WALLET_KEY is not set");
  return {
    async signPayment() {
      throw new Error("x402 payment signer not yet wired for the approved agent wallet (BUY_WALLET_KEY present but signer integration pending)");
    },
  };
}

export function buyConfigured(): boolean { return Boolean(process.env.BUY_WALLET_KEY); }

export interface PaidCallResult<T = unknown> { data: T; paidUsd: number | null; endpoint: string; at: string; }

export async function paidCall<T = unknown>(endpoint: string, payload: unknown, maxAmountUsd: number, signer?: PaymentSigner): Promise<PaidCallResult<T>> {
  const s = signer ?? envPaymentSigner(); // throws when unconfigured — by design
  const url = `${GATEWAY}${endpoint}`;
  const first = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload ?? {}) });
  if (first.status !== 402) {
    if (!first.ok) throw new Error(`buy ${endpoint} failed before payment: ${first.status}`);
    return { data: (await first.json()) as T, paidUsd: 0, endpoint, at: new Date().toISOString() };
  }
  const challenge = await first.json().catch(() => ({}));
  const signature = await s.signPayment(challenge, maxAmountUsd);
  const paid = await fetch(url, { method: "POST", headers: { "content-type": "application/json", "PAYMENT-SIGNATURE": signature }, body: JSON.stringify(payload ?? {}) });
  if (!paid.ok) throw new Error(`buy ${endpoint} failed after payment: ${paid.status}`);
  return { data: (await paid.json()) as T, paidUsd: null, endpoint, at: new Date().toISOString() };
}

/* Typed wrappers for the four services Rateqo actually uses in its loop. Prices = buy catalogue snapshot 2026-10-13. */
export const BUY_SERVICES = [
  { id: "chainstack", name: "Chainstack · Celo RPC", price: "$0.01 / request (batch ≤ 2,000 calls)", role: "Reads wallet balances + Textile contract state on Celo mainnet", endpoint: "/chainstack/celo" },
  { id: "browser", name: "Browser session", price: "$0.0037–$0.0091 / session", role: "Fetches the off-chain reference NGN/USD rate — the benchmark the strategy must beat", endpoint: "/v1/browser/sessions" },
  { id: "cencori", name: "Cencori · LLM inference", price: "$0.01 / completion", role: "Explains each decision in plain language. It never decides — the deterministic rule does", endpoint: "/cencori/v1/chat/completions" },
  { id: "screening", name: "Sanctions & address screening", price: "$0.002–$0.005 / call", role: "Screens the destination wallet before any settlement is built", endpoint: "/v1/screening/address" },
] as const;

export function chainstackCeloRpc(calls: { method: string; params: unknown[] }[], signer?: PaymentSigner) {
  return paidCall("/chainstack/celo", calls.map((c, i) => ({ jsonrpc: "2.0", id: i + 1, ...c })), 0.01, signer);
}
export function browserSession(durationMinutes = 1, signer?: PaymentSigner) {
  return paidCall("/v1/browser/sessions", { durationMinutes }, 0.0091, signer);
}
export function cencoriExplain(prompt: string, signer?: PaymentSigner) {
  return paidCall("/cencori/v1/chat/completions", { model: "maximo-atlas-1.3", max_tokens: 256, messages: [{ role: "user", content: prompt }] }, 0.01, signer);
}
export function screenAddress(address: string, signer?: PaymentSigner) {
  return paidCall("/v1/screening/address", { address }, 0.005, signer);
}
