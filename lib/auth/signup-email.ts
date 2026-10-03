import { cookies } from "next/headers";

// E-mail do cadastro em andamento, para a tela do código e o reenvio (sobrevive a recarregar a página).
export const SIGNUP_EMAIL_COOKIE = "labia_cadastro";
const PATH = "/criar-conta";

export async function rememberSignupEmail(email: string) {
  (await cookies()).set(SIGNUP_EMAIL_COOKIE, email, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: PATH,
    maxAge: 30 * 60,
  });
}

export const readSignupEmail = async () => (await cookies()).get(SIGNUP_EMAIL_COOKIE)?.value;
export const forgetSignupEmail = async () => (await cookies()).delete({ name: SIGNUP_EMAIL_COOKIE, path: PATH });
