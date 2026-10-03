import { isCookieSecretConfigured } from "@/lib/auth/invite-cookie";
import { getSupabaseAuthEnv } from "@/lib/auth/session";

// O botão do Google só aparece quando dá para usá-lo: o Supabase tem o provedor ligado (o próprio /settings dele
// diz) e o cookie assinado do cadastro tem segredo. Sem isso o clique cairia numa página de erro do Supabase.
export async function isGoogleAvailable() {
  const env = getSupabaseAuthEnv();
  if (!env || !isCookieSecretConfigured()) return false;
  try {
    const response = await fetch(`${env.url}/auth/v1/settings`, {
      headers: { apikey: env.anonKey },
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(2500),
    });
    if (!response.ok) return false;
    const settings = (await response.json()) as { external?: { google?: boolean } };
    return settings.external?.google === true;
  } catch {
    return false;
  }
}
