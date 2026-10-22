import { parseRay, edgeBps, withAttributionTag, fromAtomic, effectiveRate } from "./units";
import { preview, type FirmQuote } from "./textile";
import { buyConfigured, cencoriExplain, screenAddress } from "./buy";

export interface TreasuryRule {
  /** % of the sell-token balance to always keep (0–100) */
  keepPct: number;
  /** minimum edge over the benchmark, in bps, required to execute on price */
  minEdgeBps: number;
  /** ISO date; if today >= dueDate, convert regardless of edge (payroll/rent trigger) */
  dueDate?: string;
  /** token decimals for the sell token */
  sellDecimals: number;
  buyDecimals: number;
}

export interface CycleInput {
  rule: TreasuryRule;
  sellBalanceAtomic: string;
  quoteRateRay: string | null; // null = no_quote
  benchmarkRate: number; // human units, same orientation as quote rate
  now?: Date;
}

export interface Decision {
  action: "execute" | "wait";
  reason: string;
  edgeBps: number | null;
  convertAmountAtomic: string;
  keepAmountAtomic: string;
}

/** PURE deterministic decision function. The rule decides; the LLM only explains. */
export function decide(input: CycleInput): Decision {
  const now = input.now ?? new Date();
  const balance = BigInt(input.sellBalanceAtomic);
  const keep = (balance * BigInt(Math.round(input.rule.keepPct * 100))) / 10_000n;
  const convertible = balance - keep;
  if (convertible <= 0n) return { action: "wait", reason: `Balance is at or below the ${input.rule.keepPct}% keep reserve — nothing convertible.`, edgeBps: null, convertAmountAtomic: "0", keepAmountAtomic: keep.toString() };
  if (input.quoteRateRay === null) return { action: "wait", reason: "Textile returned no_quote for this size — no maker could cover the full amount.", edgeBps: null, convertAmountAtomic: "0", keepAmountAtomic: keep.toString() };
  const edge = edgeBps(parseRay(input.quoteRateRay), input.benchmarkRate);
  const due = input.rule.dueDate ? now >= new Date(input.rule.dueDate) : false;
  if (due) return { action: "execute", reason: `Due-date trigger reached (${input.rule.dueDate}) — convert regardless of edge (${edge} bps vs benchmark).`, edgeBps: edge, convertAmountAtomic: convertible.toString(), keepAmountAtomic: keep.toString() };
  if (edge >= input.rule.minEdgeBps) return { action: "execute", reason: `Quote beats the benchmark by ${edge} bps, at or above the ${input.rule.minEdgeBps} bps threshold.`, edgeBps: edge, convertAmountAtomic: convertible.toString(), keepAmountAtomic: keep.toString() };
  return { action: "wait", reason: `Quote edge is ${edge} bps, below the ${input.rule.minEdgeBps} bps threshold — waiting for a better rate.`, edgeBps: edge, convertAmountAtomic: "0", keepAmountAtomic: keep.toString() };
}

export interface DecisionLog {
  at: string; mode: "dry-run" | "live";
  pair: string; sellAmountAtomic: string; quoteRate: number | null; benchmarkRate: number;
  decision: Decision; explanation: string | null;
  screening: "skipped-dry-run" | "passed" | "blocked" | "not-configured";
  settle: { to: string; data: string; attributed: boolean } | null;
  txHash: string | null;
  buyCalls: { service: string; status: string }[];
}

export interface CycleRequest {
  rule: TreasuryRule; sellToken: string; buyToken: string; sellDecimals: number; buyDecimals: number;
  sellBalanceAtomic: string; benchmarkRate: number; taker: string;
  firmQuote?: FirmQuote | null;
}

/**
 * One treasury cycle. In dry-run it uses a real Textile *preview* (indicative) quote and never
 * signs, never pays, never settles. Live settlement stays gated on wallet config.
 */
export async function runCycle(body: CycleRequest, opts: { dryRun: boolean }): Promise<DecisionLog> {
  const buyCalls: DecisionLog["buyCalls"] = [];
  let rateRay: string | null = null;
  let indicativeSell = body.sellBalanceAtomic;

  if (body.firmQuote) {
    if (body.firmQuote.status === "no_quote" || !body.firmQuote.quote) rateRay = null;
    else {
      const q = body.firmQuote.quote;
      const eff = effectiveRate(q.sellAmount, q.buyAmount, body.sellDecimals, body.buyDecimals);
      rateRay = (BigInt(Math.round(eff * 1e6)) * 10n ** 21n).toString();
    }
  }
  else {
    const pv = await preview({ chainId: 42220, sellToken: body.sellToken, buyToken: body.buyToken, sellAmount: body.sellBalanceAtomic });
    if (pv.status === "no_quote") rateRay = null; else { const eff = effectiveRate(pv.sellAmount, pv.buyAmount, body.sellDecimals, body.buyDecimals); rateRay = (BigInt(Math.round(eff * 1e6)) * 10n ** 21n).toString(); } indicativeSell = pv.sellAmount ?? body.sellBalanceAtomic;
    buyCalls.push({ service: "textile-preview", status: "ok (free, indicative)" });
  }

  const decision = decide({ rule: { ...body.rule, sellDecimals: body.sellDecimals, buyDecimals: body.buyDecimals }, sellBalanceAtomic: body.sellBalanceAtomic, quoteRateRay: rateRay, benchmarkRate: body.benchmarkRate });

  let explanation: string | null = null;
  let screening: DecisionLog["screening"] = "skipped-dry-run";
  if (!opts.dryRun) {
    if (buyConfigured()) {
      try { const ex = await cencoriExplain(`Explain in one sentence for a Nigerian freelancer: decision=${decision.action}, reason=${decision.reason}`); explanation = JSON.stringify(ex.data).slice(0, 500); buyCalls.push({ service: "cencori", status: "paid call completed" }); }
      catch (e) { buyCalls.push({ service: "cencori", status: `failed: ${(e as Error).message}` }); }
      if (decision.action === "execute") {
        try { await screenAddress(body.taker); screening = "passed"; buyCalls.push({ service: "screening", status: "paid call completed" }); }
        catch (e) { screening = "blocked"; buyCalls.push({ service: "screening", status: `failed: ${(e as Error).message}` }); }
      }
    } else { screening = "not-configured"; buyCalls.push({ service: "buy", status: "live buy calls not configured (BUY_WALLET_KEY unset)" }); }
  }

  let settle: DecisionLog["settle"] = null;
  if (decision.action === "execute" && screening !== "blocked" && body.firmQuote?.transactions?.swap) {
    const raw = body.firmQuote.transactions.swap;
    const tag = process.env.ATTRIBUTION_TAG;
    // If Textile already embedded an attribution suffix (includeAttribution), broadcast data exactly as returned.
    if (raw.attributionSuffix) settle = { to: raw.to, data: raw.data, attributed: true };
    else settle = { to: raw.to, data: withAttributionTag(raw.data, tag), attributed: Boolean(tag) };
  }

  return {
    at: new Date().toISOString(), mode: opts.dryRun ? "dry-run" : "live",
    pair: `${fromAtomic(indicativeSell, body.sellDecimals)} sell → buy`,
    sellAmountAtomic: body.sellBalanceAtomic,
    quoteRate: rateRay ? parseRay(rateRay) : null, benchmarkRate: body.benchmarkRate,
    decision, explanation, screening, settle, txHash: null, buyCalls,
  };
}
