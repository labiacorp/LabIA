import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";

import { RECOVERY_COOKIE, RECOVERY_COOKIE_MAX_AGE } from "@/lib/auth/recovery";
import { createSupabaseServerClient } from "@/lib/auth/session";

// Link do e-mail de recuperação (supabase/templates/recuperacao.html). Como o de confirmação, usa token_hash
// e abre em qualquer aparelho. A sessão que sai daqui só serve para trocar a senha (cookie de recuperação).
export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  if (tokenHash) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
    if (!error) {
      (await cookies()).set(RECOVERY_COOKIE, "1", {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/redefinir-senha",
        maxAge: RECOVERY_COOKIE_MAX_AGE,
      });
      redirect("/redefinir-senha");
    }
  }
  redirect("/esqueci-a-senha?link=invalido");
}
