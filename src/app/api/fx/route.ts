import { NextResponse } from "next/server";
import { rateInfo, refreshRate } from "@/lib/fx";

// What rate the app is pricing with right now, and where it came from. Public: it is a market quote.
export async function GET() {
  await refreshRate();
  return NextResponse.json(rateInfo(), { headers: { "Cache-Control": "no-store" } });
}
