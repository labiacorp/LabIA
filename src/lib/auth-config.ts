export function googleConfigured() {
  return Boolean(
    process.env.GOOGLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_CLIENT_SECRET?.trim(),
  );
}
export function loginErrorMessage(error?: string) {
  if (!error) return null;
  if (error === "AccessDenied")
    return "Este e-mail não tem acesso à beta. Confira a conta escolhida e o código de acesso.";
  if (error === "Configuration")
    return "O login com Google ainda precisa ser configurado pela equipe.";
  if (error === "OAuthAccountNotLinked")
    return "Não conseguimos vincular esta conta. Use o mesmo método da sua entrada anterior.";
  return "Não foi possível entrar. Tente novamente e escolha a conta Google com acesso à LabIA.";
}
