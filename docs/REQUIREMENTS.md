# Zelvo — Official Requirements & Judging (both tracks)
Sources checked 2026-10-22: Loops hackathon page (loops.house/agents-on-open-rails), Textile FX docs (fx-docs.textilecredit.com), buy catalogue (usebuy.ai). Deadline: **Mon 2026-11-09 09:00 GMT** (registration AND submission). Winners Fri Nov 13. Prize pool $5,000 total; dual entry allowed — "enter as many tracks as you want; a team can win only one prize per track."

## Shared gates (all tracks)
- **Celo mainnet only** (chain 42220; testnet references in the repo are fine).
- **ERC-8004 agent identity REQUIRED** — project is invalid without an Agent ID (registry + 8004scan.io).
- **ERC-8021 attribution tag before the first transaction** — tags cannot be backfilled; transactions without the tag can't be counted. For x402 transactions, Loops needs the **PayTo wallet address** instead (tags unsupported on x402).
- **Public GitHub repo at registration**, still resolving at judging.
- **Code written during the hackathon.**
- Independent user = wallet not yours, not first funded by you or your main funder, with its own Celo activity before the hackathon started. Sponsored gas still counts the signer/authoriser, not the gas payer.

## Track 2 — Open Corridors: Textile FX — 🥇 $750 · 🥈 $250
Build agents that quote and settle FX on Textile: cNGN, wARS, wBRL, USDC against USD₮.
**Judged on: strategy P&L, volume quoted and filled, and originality.**

### Textile FX mechanics (verified from docs)
- RFQ marketplace: name a pair + exact size + taker wallet; online makers price that size; one firm quote back, or `no_quote` (all-or-nothing, no partial fills).
- Settlement: Textile's audited UniswapX `LimitOrderReactor` (v2.1.0) + Permit2 (EIP-712 maker signatures, single-use nonces). One transaction, atomic — any failed step reverts everything. Protocol fee is inside the quoted rate, charged in the sell token. Non-custodial: Textile never signs/holds keys; its API returns unsigned txs / payloads.
- Live Celo corridors: cNGN↔USD₮, USDC↔USD₮, wARS↔USD₮, wBRL↔USD₮, IDRX↔USD₮.

### Textile API v2 (base `https://api.textilecredit.com/v2`)
- `POST /v2/rfq/preview` — indicative price, free, no taker, no reservation.
- `GET /v2/rfq/levels` — per-pair price ladder, free.
- `POST /v2/rfq/request` — firm quote. Blocks up to the reply budget (750ms default, worst case ~70s cold corridor — client timeout 75s+). Firm quote TTL **60s** cap (`quote.expiresAt` is the accept cutoff). Max **4 outstanding RFQs** (over cap = 429).
- Auth: partner API key (`Authorization: Bearer <key>`) replaces the wallet signature. Keyless callers sign a `TakerControl` EIP-712 `takerProof` (covers wallet+chain ~12h).
- Response envelope `{ data: { rfqId, claimToken, status, quote{ sellAmount, buyAmount, feeAmount, takerPays, rateRay, expiresAt, reactor, orders[] }, transactions{ approval, swap } } }`. **Always broadcast `transactions.swap`** (top-level order is only the first slice of a bundle).
- Execute: approve `quote.takerPays` of sell token to `quote.reactor` → send `transactions.swap` from the taker → `POST /v2/rfq/{id}/submit {txHash}` → `GET /v2/rfq/{id}` status. Cancel/submit/status need the API key or the `X-Rfq-Claim` header (claim token comes back exactly once — store it).
- Conventions: amounts are **strings in atomic units**; rates are **RAY-scaled (1e27) strings** (`rateRay`); exactly one of `sellAmount`/`buyAmount`; mainnet size floor ≈ $1 notional.
- Attribution: send `includeAttribution: true` + `builderCodes` (≤3, `[a-z0-9_]`, 1–32 chars) on `/rfq/request` and Textile ends `transactions.swap.data` with the ERC-8021 tag (`data.attributionSuffix` returns it separately). **Do not append a second suffix yourself — indexers read only the last tag.** Zelvo's `lib/units.withAttributionTag` is only a fallback for payloads built without Textile attribution.

## Track 3 — Build with buy — $1,000 across 5 projects ($200 each)
Solve a real problem with a product that pays for services it doesn't own: compute, browsers, data, inference.
**Judged on: the problem solved + depth of integration — verified paid calls into services you don't control, and the growth they create for those services. Independent users are a qualifier. Spamming the cheapest call scores nothing.**
Submission must state the services used and provide **proof of payment**. No attribution tag needed for this track.

### buy (usebuy.ai) facts
- 782 tools, one wallet, Celo mainnet (v0.8.3 beta). Pay per request in USDC / USD₮ / USA₮ (EIP-3009) via x402; `buy curl --max-amount <cap>` via `https://gateway.usebuy.ai`. No accounts, API keys, or subscriptions; some services need a Self proof of personhood (larger Google Cloud VMs).
- Services Zelvo uses (catalogue prices, snapshot 2026-10-13): Chainstack Celo RPC **$0.01**/request (batch ≤2,000 calls); Browser sessions **$0.0037–$0.0091**; Cencori LLM inference **$0.01**/completion; Sanctions & address screening **$0.002–$0.005**. SQD data is free — useful, but not a paid call.
