import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { ACCESS_COOKIE, hasAccessPass, isGatedPath } from "@/lib/auth/access-gate";
import { isAdminUser, resolveMembership } from "@/lib/auth/session";

// Abertas a visitante. Rota nova nasce protegida: só entra aqui de propósito.
const PUBLIC_PATHS = new Set([
  "/",
  "/acesso",
  "/entrar",
  "/sem-acesso",
  "/criar-conta",
  "/criar-conta/codigo",
  "/criar-conta/confirmar",
  "/criar-conta/reenviar",
  "/esqueci-a-senha",
  "/redefinir-senha/confirmar",
  "/auth/callback",
]);
// Têm autenticação própria, fora da sessão: Bearer do MCP e segredo de pareamento do executor.
const SELF_AUTHENTICATED_PREFIXES = ["/api/mcp", "/api/executors/"];

function isSelfAuthenticated(pathname: string) {
  return SELF_AUTHENTICATED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isPublic(pathname: string) {
  return PUBLIC_PATHS.has(pathname) || isSelfAuthenticated(pathname);
}

// Redirect novo precisa levar os cookies que o Supabase acabou de renovar.
function withSessionCookies(target: NextResponse, source: NextResponse) {
  for (const cookie of source.cookies.getAll()) target.cookies.set(cookie);
  return target;
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Sem Supabase configurado ninguém entra: o app fecha em vez de abrir.
  let user = null;
  if (url && anonKey) {
    const supabase = createServerClient(url, anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
        },
      },
    });
    ({ data: { user } } = await supabase.auth.getUser());
  }

  const { pathname, search } = request.nextUrl;

  if (user && pathname === "/entrar") {
    return withSessionCookies(NextResponse.redirect(new URL("/fluxos", request.url)), response);
  }

  if (user) {
    // /admin para quem não é admin: reescreve para uma rota que não existe, e o 404 sai idêntico.
    if ((pathname === "/admin" || pathname.startsWith("/admin/")) && !isAdminUser(user)) {
      return withSessionCookies(NextResponse.rewrite(new URL("/__inexistente", request.url)), response);
    }
    // Login sem workspace: a API responde 403 aqui, antes de chegar no erro genérico da rota.
    // ponytail: uma consulta ao banco por request de API; guardar o membro num cookie assinado se pesar.
    if (pathname.startsWith("/api/") && !isSelfAuthenticated(pathname) && !(await resolveMembership(user))) {
      return NextResponse.json(
        { error: "Sua conta ainda não tem acesso a um workspace." },
        { status: 403, headers: { "Cache-Control": "no-store" } },
      );
    }
    return response;
  }

  // Access code first: a visitor without a pass never sees the auth forms (or posts to their actions).
  if (isGatedPath(pathname) && !hasAccessPass(request.cookies.get(ACCESS_COOKIE)?.value)) {
    const gate = new URL("/acesso", request.url);
    gate.searchParams.set("next", `${pathname}${search}`);
    return withSessionCookies(NextResponse.redirect(gate), response);
  }

  if (isPublic(pathname)) return response;

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Faça login para continuar." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const login = new URL("/entrar", request.url);
  login.searchParams.set("next", `${pathname}${search}`);
  return withSessionCookies(NextResponse.redirect(login), response);
}

export const config = {
  // Node, não Edge: o 403 consulta o membro no banco pelo Prisma.
  runtime: "nodejs",
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|landing/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|mp4|webm|ico|txt|xml|woff2?)$).*)",
  ],
};
