// O gate de cadastro, num lugar só: formulário e retorno do Google leem daqui.
// Padrão (2026-10-03, decisão do dono): cadastro aberto, qualquer pessoa cria conta e ganha workspace próprio sem gasto.
// LABIA_SIGNUP_MODE=invite fecha de novo: só entra com convite.
export function isSignupOpen() {
  return process.env.LABIA_SIGNUP_MODE?.trim().toLowerCase() !== "invite";
}
