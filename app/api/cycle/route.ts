import { NextResponse } from "next/server";
import { runCycle } from "@/lib/agent";
import { resolveToken, CELO_TOKENS } from "@/lib/textile";
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const live = body.live === true;
  if (live) {
    const configured = Boolean(process.env.BUY_WALLET_KEY && process.env.AGENT_WALLET_ADDRESS);
    if (!configured) return NextResponse.json({ error: "Live settlement is wallet-gated: BUY_WALLET_KEY / AGENT_WALLET_ADDRESS are not configured. Signing and broadcasting are Ahmard's approval step. Run a dry-run instead." }, { status: 501 });
    return NextResponse.json({ error: "Live settle broadcast is not enabled in this build — firm-quote signing must happen in the approved wallet session." }, { status: 501 });
  }
  try {
    const log = await runCycle({
      rule: { keepPct: Number(body.keepPct ?? 30), minEdgeBps: Number(body.minEdgeBps ?? 25), dueDate: body.dueDate || undefined, sellDecimals: 6, buyDecimals: 6 },
      sellToken: resolveToken(body.sellToken ?? "USDT"), buyToken: resolveToken(body.buyToken ?? "cNGN"),
      sellDecimals: CELO_TOKENS[body.sellToken ?? "USDT"]?.decimals ?? 6, buyDecimals: CELO_TOKENS[body.buyToken ?? "cNGN"]?.decimals ?? 6,
      sellBalanceAtomic: String(body.sellBalanceAtomic ?? "100000000"),
      benchmarkRate: Number(body.benchmarkRate ?? 0),
      taker: body.taker ?? process.env.AGENT_WALLET_ADDRESS ?? "",
    }, { dryRun: true });
    return NextResponse.json(log);
  } catch (e) { return NextResponse.json({ error: (e as Error).message }, { status: 502 }); }
}
