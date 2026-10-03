import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { completeGoogleSignIn } from "@/lib/auth/google";
import { GOOGLE_SIGNUP_COOKIE, readGoogleSignupClaim } from "@/lib/auth/invite-cookie";
import { safeNextPath } from "@/lib/auth/next-path";
import { createSupabaseServerClient } from "@/lib/auth/session";

// Retorno do Google (via Supabase). Troca o código pela sessão e só então decide: o gate de cadastro vale aqui
// tanto quanto no formulário, porque o Supabase já criou o usuário antes de qualquer código nosso rodar.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  if (!code) redirect("/entrar?erro=google");

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user) redirect("/entrar?erro=google");

  const cookieStore = await cookies();
  const claim = readGoogleSignupClaim(cookieStore.get(GOOGLE_SIGNUP_COOKIE)?.value);
  // Uso único: o cookie sai do navegador de qualquer jeito, deu certo ou não.
  cookieStore.delete({ name: GOOGLE_SIGNUP_COOKIE, path: "/" });

  const outcome = await completeGoogleSignIn(data.user, claim);
  if (!outcome.ok) {
    await supabase.auth.signOut({ scope: "local" });
    redirect(`/entrar?erro=${outcome.reason}`);
  }
  redirect(next);
}
