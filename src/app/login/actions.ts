"use server";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn } from "@/auth";
import { googleConfigured } from "@/lib/auth-config";
export async function loginGoogle() {
  if (!googleConfigured()) return;
  try {
    await signIn("google", { redirectTo: "/painel" });
  } catch (error) {
    if (error instanceof AuthError)
      redirect(`/login?error=${encodeURIComponent(error.type)}`);
    throw error;
  }
}
export async function loginDevelopment(
  _previous: { error: string },
  form: FormData,
) {
  if (process.env.NODE_ENV !== "development")
    return { error: "Use o login com Google." };
  const parsed = z.email().safeParse(
    String(form.get("email") ?? "")
      .trim()
      .toLowerCase(),
  );
  if (!parsed.success) return { error: "Digite um e-mail válido." };
  try {
    await signIn("dev", { email: parsed.data, redirectTo: "/painel" });
  } catch (error) {
    if (error instanceof AuthError)
      return {
        error: "Este e-mail não está liberado. Confira seu acesso à beta.",
      };
    throw error;
  }
  return { error: "" };
}
