"use client";
import { useMemo, useState } from "react";
import { Card, Badge, Button, StepLoader, NumberTicker } from "@/components/ui";
import { BUY_SERVICES } from "@/lib/buy";

const STEPS = ["Read state (Chainstack RPC)", "Fetch benchmark (browser)", "Textile quote", "Rule decides · Cencori explains", "Screen destination", "Build settle payload"];
type Log = { at: string; mode: string; quoteRate: number | null; benchmarkRate: number; decision: { action: string; reason: string; edgeBps: number | null; convertAmountAtomic: string }; screening: string; buyCalls: { service: string; status: string }[] };

export default function Dashboard() {
  const [keepPct, setKeepPct] = useState(30); const [minEdge, setMinEdge] = useState(25);
  const [balance, setBalance] = useState("500"); const [benchmark, setBenchmark] = useState("");
  const [dueDate, setDueDate] = useState(""); const [logs, setLogs] = useState<Log[]>([]);
  const [active, setActive] = useState(-1); const [err, setErr] = useState<string | null>(null); const [running, setRunning] = useState(false);

  const pnl = useMemo(() => logs.filter(l => l.decision.action === "execute" && l.decision.edgeBps !== null).reduce((a, l) => a + (l.decision.edgeBps ?? 0), 0), [logs]);

  async function runCycle() {
    setErr(null); setRunning(true); setActive(0);
    const timer = setInterval(() => setActive(a => Math.min(a + 1, STEPS.length - 1)), 450);
    try {
      const r = await fetch("/api/cycle", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ keepPct, minEdgeBps: minEdge, dueDate: dueDate || undefined, sellBalanceAtomic: String(Math.round(Number(balance) * 1e6)), benchmarkRate: Number(benchmark), sellToken: "USDT", buyToken: "cNGN" }) });
      const j = await r.json(); if (!r.ok) throw new Error(j.error ?? "cycle failed");
      setLogs(l => [j as Log, ...l]); setActive(STEPS.length);
    } catch (e) { setErr((e as Error).message); setActive(-1); }
    finally { clearInterval(timer); setRunning(false); }
  }
  const inputCls = "w-full rounded-lg border border-edge bg-ink px-3 py-2 text-sm outline-none focus:border-mint";
  return (
    <main className="mx-auto max-w-6xl px-5 py-10">
      <div className="flex flex-wrap items-center gap-3"><h1 className="text-3xl font-extrabold">Treasury dashboard</h1><Badge tone="gold">DRY-RUN — real preview quotes, no signing, no money moves</Badge></div>
      <p className="mt-2 max-w-2xl text-sm text-muted">Live settlement is wallet-gated on the owner’s approval (ERC-8004 identity + attribution tag + funded Celo wallet). This panel runs the full decision cycle against Textile’s free indicative preview.</p>
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card><h3 className="font-bold">Your rule</h3><div className="mt-4 space-y-3 text-sm">
          <label className="block">USD₮ balance<input className={inputCls} value={balance} onChange={e => setBalance(e.target.value)} inputMode="decimal" /></label>
          <label className="block">Keep reserve (%)<input className={inputCls} type="number" value={keepPct} onChange={e => setKeepPct(Number(e.target.value))} /></label>
          <label className="block">Minimum edge vs benchmark (bps)<input className={inputCls} type="number" value={minEdge} onChange={e => setMinEdge(Number(e.target.value))} /></label>
          <label className="block">Benchmark rate (cNGN per USD₮) — the rate you’d get manually<input className={inputCls} value={benchmark} onChange={e => setBenchmark(e.target.value)} placeholder="e.g. 1550.00" inputMode="decimal" /></label>
          <label className="block">Due date trigger (optional)<input className={inputCls} type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} /></label>
          <Button onClick={runCycle} disabled={running || !benchmark} className="moving-border w-full text-white">{running ? "Running cycle…" : "Execute cycle (dry-run)"}</Button>
          {err && <p className="text-sm text-red-300">{err}</p>}
        </div></Card>
        <Card><h3 className="font-bold">Cycle</h3><div className="mt-4"><StepLoader steps={STEPS} active={active} /></div>
          <div className="mt-4 border-t border-edge pt-3 text-sm"><p className="text-muted">Cumulative edge on executed decisions</p><p className="text-2xl"><NumberTicker value={pnl} decimals={0} suffix=" bps" /></p></div></Card>
        <Card><h3 className="font-bold">Paid inputs via buy <span className="text-xs text-muted">(Track 3)</span></h3>
          <ul className="mt-3 space-y-3">{BUY_SERVICES.map(s => (<li key={s.id} className="rounded-lg border border-edge p-3"><div className="flex items-center justify-between gap-2"><span className="text-sm font-semibold">{s.name}</span><Badge tone="muted">{s.price}</Badge></div><p className="mt-1 text-xs text-muted">{s.role}</p></li>))}</ul>
          <p className="mt-3 text-xs text-muted">In dry-run none of these are charged. Live paid calls require the approved agent wallet — the client throws rather than faking a call.</p></Card>
      </div>
      <Card className="mt-4"><h3 className="font-bold">Decision log</h3>
        {logs.length === 0 ? <p className="mt-3 text-sm text-muted">No cycles yet. Set a benchmark rate and run one.</p> : (
        <div className="mt-3 overflow-x-auto"><table className="w-full text-left text-sm"><thead className="text-xs uppercase text-muted"><tr><th className="py-2 pr-3">Time</th><th className="pr-3">Mode</th><th className="pr-3">Quote rate</th><th className="pr-3">Benchmark</th><th className="pr-3">Edge</th><th className="pr-3">Action</th><th>Reason</th></tr></thead><tbody>
          {logs.map((l, i) => (<tr key={i} className="border-t border-edge/60"><td className="py-2 pr-3 font-mono text-xs">{new Date(l.at).toLocaleTimeString()}</td><td className="pr-3">{l.mode}</td><td className="pr-3 font-mono">{l.quoteRate?.toFixed(4) ?? "no_quote"}</td><td className="pr-3 font-mono">{l.benchmarkRate}</td><td className="pr-3 font-mono">{l.decision.edgeBps ?? "—"} bps</td><td className="pr-3">{l.decision.action === "execute" ? <Badge>EXECUTE</Badge> : <Badge tone="gold">WAIT</Badge>}</td><td className="text-muted">{l.decision.reason}</td></tr>))}
        </tbody></table></div>)}
      </Card>
    </main>
  );
}
