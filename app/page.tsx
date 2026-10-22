"use client";
import { useEffect, useState } from "react";
import { Card, Badge, NumberTicker, LoopBeam } from "@/components/ui";

interface PreviewState { status: "loading" | "live" | "unavailable"; rate?: number; buy?: string; msg?: string; }
const fmtRate = (ray?: string) => { if (!ray) return undefined; const v = BigInt(ray); return Number(v / 10n ** 23n) / 10000; };

export default function Home() {
  const [pv, setPv] = useState<PreviewState>({ status: "loading" });
  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/preview", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ sellToken: "0x48065fbbe25f71c9282ddf5e1cd6d6a887483d5e", buyToken: "0xf6829d7393dae24509eb1e52ee8e572e2e271a4f", sellAmount: "100000000" }) });
        const j = await r.json();
        if (!r.ok) throw new Error(j.error ?? "preview failed");
        if (j.status === "no_quote") setPv({ status: "unavailable", msg: "Textile returned no_quote for 100 USDT → cNGN right now." });
        else setPv({ status: "live", rate: Number(j.buyAmount) / Number(j.sellAmount), buy: j.buyAmount });
      } catch (e) { setPv({ status: "unavailable", msg: (e as Error).message }); }
    })();
  }, []);
  return (
    <main className="grid-bg">
      <section className="mx-auto max-w-6xl px-5 pb-14 pt-16">
        <Badge>Loops House · Agents on Open Rails — Track 2 + Track 3</Badge>
        <h1 className="mt-5 max-w-3xl text-5xl font-extrabold leading-[1.05] tracking-tight">Zelvo. <span className="text-mint">The firm quote, minus the desk.</span></h1>
        <p className="mt-5 max-w-2xl text-lg text-muted">A treasury agent for Nigerian freelancers and businesses who earn in USD₮/USDC and spend in naira. You set the rule once — keep a reserve, convert when the rate is right or by payday. Zelvo watches Textile FX, decides, and settles in cNGN on Celo. No OTC-desk chats.</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <a href="/app" className="moving-border rounded-xl px-5 py-3 text-sm font-bold text-white">Open the dashboard →</a>
          <a href="https://github.com/ahmardchain/zelvo" className="rounded-xl border border-edge px-5 py-3 text-sm font-semibold text-muted hover:text-white">Read the code</a>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          <Card><p className="text-xs uppercase tracking-widest text-muted">Textile preview · 100 USD₮ → cNGN</p>
            {pv.status === "loading" && <p className="mt-3 animate-pulse text-muted">Fetching a real indicative quote…</p>}
            {pv.status === "live" && <><p className="mt-2 text-3xl"><NumberTicker value={pv.rate ?? 0} decimals={4} /></p><p className="mt-1 text-xs text-mint">● LIVE — indicative preview from Textile makers (not a firm quote)</p></>}
            {pv.status === "unavailable" && <><p className="mt-3 text-sm text-gold">Quote unavailable</p><p className="mt-1 text-xs text-muted">{pv.msg}</p></>}
          </Card>
          <Card><p className="text-xs uppercase tracking-widest text-muted">How it decides</p><p className="mt-3 text-sm leading-relaxed">A <strong>deterministic rule</strong> decides — never the LLM. Paid inference only writes the explanation a human reads.</p></Card>
          <Card><p className="text-xs uppercase tracking-widest text-muted">What it pays for</p><p className="mt-3 text-sm leading-relaxed">Chainstack RPC, a browser benchmark, Cencori inference, address screening — bought per-request via <strong>buy</strong> (x402 on Celo), ≈ $0.03 a cycle.</p></Card>
        </div>
        <div className="mt-6"><LoopBeam /></div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <Card><h3 className="font-bold">Track 2 — Textile FX <span className="text-gold">$750 / $250</span></h3><p className="mt-2 text-sm text-muted">Judged on strategy P&amp;L, volume quoted and filled, originality. Every settlement is logged against the benchmark it beat — that log <em>is</em> the P&amp;L evidence.</p></Card>
          <Card><h3 className="font-bold">Track 3 — Build with buy <span className="text-gold">$200 × 5</span></h3><p className="mt-2 text-sm text-muted">Judged on the problem and depth of integration: verified paid calls into services Zelvo doesn’t own. The decision log doubles as the proof-of-payment pack.</p></Card>
        </div>
      </section>
    </main>
  );
}
