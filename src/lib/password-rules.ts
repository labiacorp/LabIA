// No imports on purpose: the sign-up form (a client component) needs these, and importing them from
// password.ts would ship scrypt and its module-level dummy hash into the browser bundle.
export const PASSWORD_MIN = 4;
export const PASSWORD_MAX = 128;

export function passwordError(password: string) {
  if (password.length < PASSWORD_MIN) return `Use pelo menos ${PASSWORD_MIN} caracteres na senha.`;
  if (password.length > PASSWORD_MAX) return `Use no máximo ${PASSWORD_MAX} caracteres na senha.`;
  return null;
}
