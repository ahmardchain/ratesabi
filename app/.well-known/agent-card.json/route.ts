import { NextResponse } from "next/server";
import { agentCard } from "@/lib/erc8004";
export async function GET(req: Request) {
  const url = new URL(req.url);
  return NextResponse.json(agentCard(process.env.NEXT_PUBLIC_APP_URL ?? `${url.protocol}//${url.host}`, process.env.AGENT_WALLET_ADDRESS || undefined));
}
