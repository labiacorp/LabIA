import { appendFile, mkdir } from "node:fs/promises";
import { headers } from "next/headers";

// Off in production until both RESEND_API_KEY and EMAIL_FROM exist (there is no sending domain yet).
// While off, everything that depends on a mailed link is hidden or refused: password sign-up, password
// reset, e-mail change. Password sign-in, Google, and the rest of the account page keep working.
// Development always counts as on, because it writes to the outbox below.
export const emailEnabled = () =>
  process.env.NODE_ENV !== "production" || Boolean(process.env.RESEND_API_KEY?.trim() && process.env.EMAIL_FROM?.trim());

// Transactional e-mail through Resend's HTTP API (no SDK: one POST). Production needs RESEND_API_KEY
// and EMAIL_FROM. Without them, development writes each message to .handoff/outbox.jsonl (gitignored)
// so the flows can be driven locally and by Playwright; production refuses to pretend it sent.
export async function sendEmail(message: { to: string; subject: string; text: string; html: string }) {
  const key = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim();
  if (!key || !from) {
    if (process.env.NODE_ENV === "production") throw new Error("RESEND_API_KEY and EMAIL_FROM must be set.");
    await mkdir(".handoff", { recursive: true });
    await appendFile(".handoff/outbox.jsonl", `${JSON.stringify({ at: new Date().toISOString(), ...message })}\n`);
    return;
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, ...message }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Resend responded ${response.status}`);
}

// Links in e-mails must never be built from the request's Host header: a forged Host on a reset request
// would mail the victim a link to someone else's domain carrying a live token. Production uses the
// configured origin; development falls back to the local server's own address.
export async function appUrl() {
  const configured = process.env.LABIA_PUBLIC_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  if (process.env.NODE_ENV === "production") throw new Error("LABIA_PUBLIC_URL must be set.");
  return `http://${(await headers()).get("host") ?? "localhost:3000"}`;
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

// One plain layout for every message: a few paragraphs and at most one button. Text part included.
export function emailBody(paragraphs: string[], action?: { label: string; url: string }, code?: string) {
  const text = [...paragraphs, code ? `Código: ${code}` : "", action ? `${action.label}: ${action.url}` : "", "LabIA"].filter(Boolean).join("\n\n");
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.6;color:#111;max-width:480px">${paragraphs.map((p) => `<p>${escapeHtml(p)}</p>`).join("")}${code ? `<p style="font-size:28px;letter-spacing:6px;font-weight:600">${escapeHtml(code)}</p>` : ""}${action ? `<p><a href="${escapeHtml(action.url)}" style="display:inline-block;background:#3d5afe;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">${escapeHtml(action.label)}</a></p><p style="color:#666;font-size:13px">Se o botão não funcionar, copie este endereço: ${escapeHtml(action.url)}</p>` : ""}<p style="color:#666;font-size:13px">LabIA</p></div>`;
  return { text, html };
}
