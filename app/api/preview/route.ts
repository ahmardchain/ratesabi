import { NextResponse } from "next/server";
import { preview, levels } from "@/lib/textile";
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  try {
    if (searchParams.get("levels")) return NextResponse.json(await levels(searchParams.get("pair") ?? undefined));
    return NextResponse.json({ error: "use POST for preview, or ?levels=1" }, { status: 400 });
  } catch (e) { return NextResponse.json({ error: (e as Error).message, live: false }, { status: 502 }); }
}
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = await preview({ chainId: 42220, sellToken: body.sellToken, buyToken: body.buyToken, sellAmount: body.sellAmount, buyAmount: body.buyAmount });
    return NextResponse.json({ ...data, live: true });
  } catch (e) { return NextResponse.json({ error: (e as Error).message, live: false }, { status: 502 }); }
}
