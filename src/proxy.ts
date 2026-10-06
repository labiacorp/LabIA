import { NextResponse, type NextRequest } from "next/server";
import { auth } from "@/auth";

// Visitors (and anyone whose session cookie is stale) see the landing at "/"; signed-in users keep the studio.
// Checks the session itself: a leftover expired cookie must not count as "signed in".
export async function proxy(request: NextRequest) {
  const session = await auth();
  return session?.user?.id ? NextResponse.next() : NextResponse.rewrite(new URL("/lp", request.url));
}

export const config = { matcher: "/" };
