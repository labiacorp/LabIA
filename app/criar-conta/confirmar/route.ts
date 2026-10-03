import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { DEFAULT_AFTER_LOGIN_PATH } from "@/lib/auth/next-path";
import { createSupabaseServerClient } from "@/lib/auth/session";

// Link do e-mail de confirmação (template em supabase/templates/confirmacao.html).
// verifyOtp com token_hash não depende do navegador que fez o cadastro: abre em qualquer aparelho.
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  if (tokenHash) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "email" });
    if (!error) redirect(DEFAULT_AFTER_LOGIN_PATH);
  }
  redirect("/entrar?link=invalido");
}
