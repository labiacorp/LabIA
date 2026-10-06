import { appUrl, emailBody, sendEmail } from "@/lib/email";

// Every account e-mail LabIA sends, in one place. Copy is PT-BR, like the product.
export async function sendVerifyEmail(to: string, token: string, code: string) {
  const url = `${await appUrl()}/verificar-email/${token}`;
  await sendEmail({ to, subject: "Confirme seu e-mail na LabIA", ...emailBody(["Falta só confirmar que este e-mail é seu. Use o botão ou digite o código na tela de confirmação.", "O link e o código valem por 24 horas."], { label: "Confirmar e-mail", url }, code) });
}

// Sign-up with an address that already has an account gets this instead, so the form answers the
// same thing either way and nobody learns which addresses are registered.
export async function sendAccountExists(to: string) {
  const base = await appUrl();
  await sendEmail({ to, subject: "Você já tem uma conta na LabIA", ...emailBody(["Alguém tentou criar uma conta na LabIA com este e-mail, mas ele já tem uma. Se foi você, entre normalmente. Se esqueceu a senha, crie uma nova pelo link abaixo.", "Se não foi você, pode ignorar este e-mail."], { label: "Criar nova senha", url: `${base}/esqueci-senha` }) });
}

export async function sendResetEmail(to: string, token: string) {
  const url = `${await appUrl()}/redefinir-senha/${token}`;
  await sendEmail({ to, subject: "Criar uma nova senha na LabIA", ...emailBody(["Recebemos um pedido para criar uma nova senha para esta conta. O link vale por 1 hora e só funciona uma vez.", "Se não foi você, ignore este e-mail: sua senha atual continua valendo."], { label: "Criar nova senha", url }) });
}

export async function sendEmailChangeConfirm(to: string, token: string) {
  const url = `${await appUrl()}/verificar-email/${token}`;
  await sendEmail({ to, subject: "Confirme seu novo e-mail na LabIA", ...emailBody(["Para trocar o e-mail da sua conta LabIA para este endereço, confirme pelo botão abaixo. Até lá, o e-mail anterior continua valendo.", "O link vale por 24 horas."], { label: "Confirmar novo e-mail", url }) });
}

export async function sendEmailChangedNotice(to: string, newEmail: string) {
  await sendEmail({ to, subject: "O e-mail da sua conta LabIA mudou", ...emailBody([`O e-mail de acesso da sua conta LabIA agora é ${newEmail}.`, "Se não foi você, responda a este e-mail ou fale com a equipe imediatamente."]) });
}

// Team entrance while the product is closed: an owner who asks for an invite with their own address gets this.
export async function sendTeamAccessEmail(to: string, token: string) {
  const url = `${await appUrl()}/acesso/${token}`;
  await sendEmail({ to, subject: "Seu acesso à LabIA", ...emailBody(["Use o botão para abrir a entrada da equipe neste navegador. O link vale por 15 minutos e só funciona uma vez.", "Se não foi você, ignore este e-mail: sem o link, ninguém entra."], { label: "Abrir a entrada", url }) });
}
