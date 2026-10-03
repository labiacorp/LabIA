import { headers } from "next/headers";

import { prisma } from "@/lib/db/prisma";

const MINUTE = 60;
const HOUR = 60 * MINUTE;

// Janela deslizante em segundos. Cada ação conta por IP e por e-mail, e os dois precisam passar.
const LIMITS = {
  "signup-ip": { limit: 40, windowSeconds: 10 * MINUTE },
  "signup-email": { limit: 10, windowSeconds: HOUR },
  "login-ip": { limit: 20, windowSeconds: 5 * MINUTE },
  "login-email": { limit: 8, windowSeconds: 15 * MINUTE },
  "resend-ip": { limit: 10, windowSeconds: HOUR },
  "resend-email": { limit: 3, windowSeconds: HOUR },
  "forgot-ip": { limit: 5, windowSeconds: 10 * MINUTE },
  "forgot-email": { limit: 3, windowSeconds: HOUR },
  "code-ip": { limit: 20, windowSeconds: 10 * MINUTE },
  // Shared access code: the only defence against guessing it, so tighter than the other anonymous forms.
  "access-ip": { limit: 8, windowSeconds: 10 * MINUTE },
} as const;
export type LimitBucket = keyof typeof LIMITS;

// Bloqueio por falhas seguidas (login e código de 6 dígitos): conta falhas, não tentativas.
export const LOGIN_LOCK = { prefix: "login-fail", failures: 5, windowSeconds: 15 * MINUTE } as const;
export const CODE_LOCK = { prefix: "code-fail", failures: 5, windowSeconds: 30 * MINUTE } as const;
export type FailureLock = typeof LOGIN_LOCK | typeof CODE_LOCK;

export const TOO_MANY_ATTEMPTS = "Muitas tentativas. Espere alguns minutos e tente de novo.";
// Supabase refuses to send more e-mail (its default SMTP allows only a couple per hour per project). It is not the
// visitor's fault, so it must not read like one, and it must be told apart from our own limiter in the logs.
export const EMAIL_SEND_BUSY = "Estamos enviando muitos e-mails agora. Tente de novo em alguns minutos.";
export const isEmailSendLimit = (error: { code?: string } | null | undefined) => error?.code === "over_email_send_rate_limit";

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

// Vercel reescreve x-forwarded-for com o IP do cliente; fora dela o valor não é confiável, e o limite por e-mail segura.
export async function clientIp() {
  const requestHeaders = await headers();
  return requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() || requestHeaders.get("x-real-ip") || "unknown";
}

// Uma consulta: só grava a tentativa se a janela ainda tem vaga. Tentativa negada não é gravada,
// então quem insiste não prolonga o próprio bloqueio.
// ponytail: contar e gravar não é serializável; com muita concorrência passam algumas tentativas a mais.
// Se virar problema, trocar por pg_advisory_xact_lock(hashtext(key)) na mesma consulta.
async function hit(key: string, limit: number, windowSeconds: number) {
  const rows = await prisma.$queryRaw<{ id: bigint }[]>`
    INSERT INTO rate_limit_events (key, created_at)
    SELECT ${key}, now()
    WHERE (SELECT count(*) FROM rate_limit_events
           WHERE key = ${key} AND created_at > now() - (${windowSeconds}::int * interval '1 second')) < ${limit}::int
    RETURNING id`;
  if (Math.random() < 0.02) {
    await prisma.$executeRaw`DELETE FROM rate_limit_events WHERE created_at < now() - interval '1 day'`;
  }
  return rows.length === 1;
}

// Falha de banco abre a porta (e registra): o Supabase Auth tem os próprios limites, e derrubar o login
// por causa do contador seria pior. Troque por "fecha" se preferir o contrário.
// A database that hangs is treated like one that errors: without the cap the form would sit on "loading" for
// as long as the driver keeps retrying, which is not "fail open" in any useful sense.
const DB_TIMEOUT_MS = 3000;

async function failOpen<T>(label: string, fallback: T, run: () => Promise<T>) {
  try {
    return await Promise.race([
      run(),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`timed out after ${DB_TIMEOUT_MS}ms`)), DB_TIMEOUT_MS)),
    ]);
  } catch (error) {
    console.error(`[auth/rate-limit] ${label}`, error);
    return fallback;
  }
}

export async function allow(checks: Array<[LimitBucket, string]>) {
  return failOpen("allow", true, async () => {
    for (const [bucket, subject] of checks) {
      const { limit, windowSeconds } = LIMITS[bucket];
      if (!(await hit(`${bucket}:${subject}`, limit, windowSeconds))) return false;
    }
    return true;
  });
}

export const isLocked = (lock: FailureLock, email: string) =>
  failOpen("isLocked", false, async () => {
    const [{ total }] = await prisma.$queryRaw<{ total: bigint }[]>`
      SELECT count(*) AS total FROM rate_limit_events
      WHERE key = ${`${lock.prefix}:${email}`} AND created_at > now() - (${lock.windowSeconds}::int * interval '1 second')`;
    return Number(total) >= lock.failures;
  });

export const recordFailure = (lock: FailureLock, email: string) =>
  failOpen("recordFailure", undefined, async () => {
    await prisma.$executeRaw`INSERT INTO rate_limit_events (key, created_at) VALUES (${`${lock.prefix}:${email}`}, now())`;
  });

export const clearFailures = (lock: FailureLock, email: string) =>
  failOpen("clearFailures", undefined, async () => {
    await prisma.$executeRaw`DELETE FROM rate_limit_events WHERE key = ${`${lock.prefix}:${email}`}`;
  });
