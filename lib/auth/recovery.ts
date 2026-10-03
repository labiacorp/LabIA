// Marca a sessão aberta pelo link de recuperação. Sem ela, quem só está logado não troca a senha sem
// saber a atual (isso é a tela Conta, A3): /redefinir-senha exige este cookie, além da sessão.
export const RECOVERY_COOKIE = "labia_recuperacao";
export const RECOVERY_COOKIE_MAX_AGE = 15 * 60;
