# RateSabi — "RateSabi knows the rate."

A treasury agent for Nigerian freelancers and small businesses who **earn in USD₮/USDC and spend in naira**.

You set a rule once — *keep 30% in USD₮, convert the rest to cNGN when Textile's quote beats the rate you'd get manually, or by payday* — and RateSabi watches, decides, and settles. No sitting in OTC-desk chats haggling over the rate.

Built for **Loops House — Agents on Open Rails** (deadline Nov 9, 2026), entered in **two tracks with one agent**:
- **Track 2 · Open Corridors — Textile FX** ($750 / $250): judged on strategy P&L, volume quoted and filled, originality.
- **Track 3 · Build with buy** ($200 × 5): judged on the problem solved and depth of integration — verified paid calls into services the product doesn't own.

Full requirements digest: [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) · Brand: [BRAND.md](BRAND.md)

## How one loop satisfies both tracks
The **buy calls are the inputs**, the **Textile settlement is the output**. Same wallet, same decision log.

| Step | Service | Cost | What it does |
|---|---|---|---|
| Read state | buy → Chainstack Celo RPC | $0.01 / batch ≤2,000 calls | Wallet balances + Textile contract state on Celo |
| Benchmark | buy → Browser session | $0.0037–$0.0091 | Fetches the off-chain reference NGN/USD rate — the number the strategy must beat |
| Quote | Textile FX RFQ (free preview; firm quote on commit) | fee inside the rate | Firm cNGN↔USD₮ quote from independent makers, 60s TTL, atomic one-tx settlement via UniswapX LimitOrderReactor + Permit2 |
| Decide + explain | buy → Cencori inference | $0.01 | Writes the human-readable reason. **The deterministic rule decides — the LLM never has discretion over money** |
| Screen | buy → Sanctions/address screening | $0.002–$0.005 | Screens the destination before any settlement payload is built |
| Settle | Taker wallet signs `transactions.swap` | — | With ERC-8021 attribution (Textile `includeAttribution`/`builderCodes`, or a suffix only when Textile didn't embed one) |

## Architecture
- `lib/textile.ts` — Textile API v2 client (preview / levels / firm request / submit / status), real response-envelope + `rateRay` handling, 75s+ timeouts, claim-token headers.
- `lib/buy.ts` — buy gateway client. `paidCall()` runs the x402 402→sign→retry flow behind a `PaymentSigner` interface. **If `BUY_WALLET_KEY` is not configured it throws "live buy calls not configured" — it never fakes a paid call.**
- `lib/agent.ts` — the treasury cycle + the pure, unit-tested `decide()` rule engine (keep-reserve, min-edge in bps vs benchmark, due-date trigger, no_quote handling). Effective rates are computed from actual amounts, not from `rateRay` orientation.
- `lib/erc8004.ts` — ERC-8004 agent-card generator, served at `/.well-known/agent-card.json`, + registration steps.
- `app/` — landing with a **live** Textile preview ticker (labelled indicative, errors shown honestly) and `/app` dashboard: rule configurator, multi-step cycle runner (dry-run against real preview quotes), decision-log table, cumulative edge (P&L vs benchmark), buy-services panel.

## Run it
```bash
npm install
cp .env.example .env.local   # fill only what you have approval for
npm run dev                  # http://localhost:3000
npm test                     # unit tests (rule engine, RAY, atomic units, attribution, expiry)
npm run build
```

## Judging evidence — how the packs are produced
Every cycle appends a `DecisionLog` (quote, benchmark, edge bps, action, reason, screening result, settle payload, buy-call receipts). At submission:
- **Textile pack:** filter logs to executed settlements → quoted volume, filled volume (tx hashes via `submit`), and P&L = Σ executed amount × edge vs benchmark.
- **buy pack:** the same logs list each paid service, endpoint, amount cap and completion status — the proof-of-payment index to attach to the submission.

## Honest status
- ✅ Live: Textile preview/levels integration (verified against the real API — Celo token addresses in `lib/textile.ts` come from the live `/levels` response), rule engine + tests, agent card, dashboard dry-run cycle.
- 🔒 Wallet-gated (owner approval required, by design): firm-quote signing/broadcast, live buy paid calls (x402 signer wiring for the approved wallet), ERC-8004 on-chain registration, Loops registration, funding. The API returns **501 with an explicit message** for live settle attempts while unconfigured.
- Nothing in this repo fabricates quotes, users, volume, or payments. Dry-run is labelled dry-run everywhere it appears.
