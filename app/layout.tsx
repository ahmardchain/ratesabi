import "./globals.css";
import type { Metadata } from "next";
export const metadata: Metadata = { title: "Zelvo — The firm quote, minus the desk", description: "Treasury agent for Nigerian earners in USDT/USDC spending cNGN. It buys its inputs per-request via buy on Celo, decides by a deterministic rule, and settles FX on Textile." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="en"><body className="font-sans antialiased">
    <header className="sticky top-0 z-40 border-b border-edge/70 bg-ink/85 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
        <a href="/" className="text-lg font-extrabold tracking-tight">Zel<span className="text-mint">vo</span></a>
        <nav className="flex items-center gap-4 text-sm text-muted"><a className="hover:text-white" href="/app">Dashboard</a><a className="hover:text-white" href="https://github.com/ahmardchain/zelvo">GitHub</a><span className="hidden sm:inline"><span className="rounded-full border border-edge px-2 py-0.5 text-[11px]">Celo mainnet · 42220</span></span></nav>
      </div>
    </header>
    {children}
    <footer className="border-t border-edge/70 py-8 text-center text-xs text-muted">Zelvo — built for Loops House “Agents on Open Rails” (Track 2 Textile FX + Track 3 Build with buy). Live settlement is wallet-gated; nothing on this site moves money without the owner’s approval.</footer>
  </body></html>);
}
