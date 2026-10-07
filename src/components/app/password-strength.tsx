"use client";

// Design meter under "Nova senha" / "Senha": four bars and a hint. Informative only; the rule that blocks a
// password is PASSWORD_MIN in password-rules.ts.
export function passwordScore(password: string) {
  if (!password) return 0;
  let score = password.length >= 8 ? 2 : 1;
  if (/\d/.test(password) && /[a-zA-Z]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password) && password.length >= 10) score++;
  return Math.min(score, 4);
}

export function PasswordStrength({ password }: { password: string }) {
  const score = passwordScore(password);
  if (!password) return null;
  const weak = score <= 1;
  return <span className="flex flex-col gap-1.5">
    <span className="flex gap-1" aria-hidden>{[0, 1, 2, 3].map((bar) => <span key={bar} className={`h-1 flex-1 rounded-sm ${bar < score ? (weak ? "bg-lab-danger" : "bg-lab-text") : "bg-lab-border-strong"}`} />)}</span>
    <span className={`text-[13px] ${weak ? "text-lab-danger" : "text-lab-text-dim"}`}>{weak ? "Fraca. Use 8 ou mais caracteres, com número ou símbolo." : score < 4 ? "Boa. Um símbolo a mais deixa forte." : "Forte."}</span>
  </span>;
}
