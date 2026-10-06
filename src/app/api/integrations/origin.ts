import { NextResponse, type NextRequest } from "next/server";

// Origin used for OAuth redirect URIs. In production it is only ever LABIA_PUBLIC_URL (https); the Host
// header is never trusted there. Returns null when production has no valid public URL.
export function socialOrigin(request: NextRequest): string | null {
  if (process.env.NODE_ENV !== "production") {
    // Next dev reports localhost even when the browser is on 127.0.0.1, where the session cookie lives.
    try {
      const url = new URL(process.env.AUTH_URL ?? "");
      if (url.protocol === "http:" || url.protocol === "https:") return url.origin;
    } catch {}
    return request.nextUrl.origin;
  }
  try {
    const url = new URL(process.env.LABIA_PUBLIC_URL ?? "");
    return url.protocol === "https:" ? url.origin : null;
  } catch {
    return null;
  }
}

// Relative redirect: needs no origin, so it also works when the origin is unavailable.
export function redirectTo(path: string) {
  return new NextResponse(null, { status: 307, headers: { Location: path } });
}
