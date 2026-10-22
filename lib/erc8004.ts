/** ERC-8004 agent registration file (agent card) generator.
 * On-chain registration is NOT performed here — it needs Ahmard's wallet approval.
 * Register on Celo mainnet via the ERC-8004 Identity Registry (see docs/REQUIREMENTS.md), then verify on 8004scan.io. */
export function agentCard(appUrl: string, walletAddress?: string) {
  return {
    type: "https://eips.ethereum.org/EIPS/eip-8004#registration-v1",
    name: "Zelvo",
    description: "Treasury agent for Nigerian earners in USDT/USDC spending cNGN. It buys data, a benchmark rate, inference and address screening per-request via buy (x402 on Celo), decides with a deterministic rule, and settles FX on Textile (Celo, chain 42220).",
    image: `${appUrl}/og.png`,
    services: [
      { name: "web", endpoint: appUrl },
      { name: "A2A", endpoint: `${appUrl}/.well-known/agent-card.json`, version: "0.3.0" },
    ],
    x402Support: true,
    active: true,
    registrations: [] as unknown[], // filled after on-chain registration: { agentId, agentRegistry: "eip155:42220:<identity-registry-address>" }
    supportedTrust: ["reputation"],
    ...(walletAddress ? { agentWallet: walletAddress } : {}),
  };
}
export const REGISTRATION_STEPS = [
  "1. Ahmard approves the agent wallet on Celo mainnet (his gate — no wallet is created by this repo).",
  "2. Serve agentCard() at /.well-known/agent-card.json and pin/host it at a stable URL.",
  "3. Call register(agentURI) on the ERC-8004 Identity Registry on Celo (chain 42220) from the agent wallet.",
  "4. Record the returned agentId in registrations[] and redeploy.",
  "5. Verify the agent resolves on 8004scan.io before the first judged transaction.",
];
