import React from "react";
export function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-edge bg-panel/80 backdrop-blur p-5 ${className}`}>{children}</div>;
}
export function Badge({ children, tone = "mint" }: { children: React.ReactNode; tone?: "mint" | "gold" | "muted" | "red" }) {
  const tones = { mint: "text-mint border-mint/40 bg-mint/10", gold: "text-gold border-gold/40 bg-gold/10", muted: "text-muted border-edge bg-white/5", red: "text-red-300 border-red-400/40 bg-red-400/10" };
  return <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold tracking-wide ${tones[tone]}`}>{children}</span>;
}
export function Button({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button {...props} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition disabled:opacity-50 ${className}`}>{children}</button>;
}
/** Magic UI-style animated number (CSS transition on value change via key change + animation). */
export function NumberTicker({ value, decimals = 2, prefix = "", suffix = "" }: { value: number; decimals?: number; prefix?: string; suffix?: string }) {
  return <span key={value} className="ticker inline-block font-mono tabular-nums">{prefix}{value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</span>;
}
/** Aceternity-style multi-step loader for the agent cycle. */
export function StepLoader({ steps, active }: { steps: string[]; active: number }) {
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => (
        <li key={s} className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-all ${i < active ? "border-mint/40 text-mint" : i === active ? "border-gold/50 text-gold animate-pulse" : "border-edge text-muted"}`}>
          <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${i < active ? "bg-mint text-ink" : i === active ? "bg-gold text-ink" : "bg-edge text-muted"}`}>{i < active ? "✓" : i + 1}</span>{s}
        </li>
      ))}
    </ol>
  );
}
/** AnimatedBeam-style SVG beam tracing the agent loop. */
export function LoopBeam() {
  const nodes = ["Read state", "Benchmark", "Textile quote", "Rule decides", "Screen", "Settle"];
  return (
    <div className="relative overflow-hidden rounded-2xl border border-edge bg-panel/60 p-5">
      <svg viewBox="0 0 600 60" className="w-full" aria-hidden>
        <path d="M20 30 H580" stroke="#1c2a44" strokeWidth="2" />
        <path d="M20 30 H580" stroke="#35e0b0" strokeWidth="2" strokeDasharray="10 14" className="beam" fill="none" />
      </svg>
      <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
        {nodes.map((n, i) => (<div key={n} className="text-center"><div className="mx-auto mb-1 h-2.5 w-2.5 rounded-full bg-mint shadow-[0_0_12px_#35e0b0]" /><p className="text-[11px] font-medium text-muted">{i + 1}. {n}</p></div>))}
      </div>
    </div>
  );
}
