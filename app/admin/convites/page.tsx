import type { Metadata } from "next";

import { revokeInviteAction } from "@/app/admin/convites/actions";
import { CreateInviteForm } from "@/app/admin/convites/create-invite-form";
import { Button } from "@/components/ui/button";
import { requireAdmin } from "@/lib/auth/invites";
import { prisma } from "@/lib/db/prisma";

export const metadata: Metadata = { title: "Convites · LabIA" };
export const dynamic = "force-dynamic";

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

function inviteStatus(invite: { usedAt: Date | null; expiresAt: Date }, now: Date) {
  if (invite.usedAt) return { label: "Usado", className: "text-lab-text-muted" };
  if (invite.expiresAt <= now) return { label: "Vencido", className: "text-lab-warning" };
  return { label: "Aberto", className: "text-lab-success" };
}

export default async function ConvitesPage() {
  await requireAdmin();
  const [invites, workspaces] = await Promise.all([
    prisma.invite.findMany({ orderBy: { createdAt: "desc" }, take: 50, include: { workspace: { select: { name: true } } } }),
    prisma.workspace.findMany({ orderBy: { createdAt: "asc" }, select: { id: true, name: true } }),
  ]);
  const now = new Date();

  return (
    <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10">
      <p className="font-mono text-xs uppercase tracking-[0.18em] text-lab-reagent-bright">Admin</p>
      <h1 className="mt-2 font-display text-2xl font-semibold text-lab-text">Convites</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-lab-text-dim">
        Cada link cria uma conta, uma vez, em até 7 dias. Preso a um e-mail, só aquele e-mail usa. Workspace novo nasce sem
        gasto liberado: a pessoa cota, mas não gera nada pago.
      </p>

      <section className="mt-8 rounded-lab border border-lab-border bg-lab-surface-1 p-5">
        <CreateInviteForm workspaces={workspaces} />
      </section>

      <section className="mt-8 overflow-x-auto rounded-lab border border-lab-border bg-lab-surface-1">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="border-b border-lab-border font-mono text-[11px] uppercase tracking-wide text-lab-text-muted">
            <tr>
              <th className="px-4 py-3 font-normal">E-mail</th>
              <th className="px-4 py-3 font-normal">Destino</th>
              <th className="px-4 py-3 font-normal">Status</th>
              <th className="px-4 py-3 font-normal">Vence</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {invites.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-lab-text-dim">
                  Nenhum convite ainda.
                </td>
              </tr>
            ) : null}
            {invites.map((invite) => {
              const status = inviteStatus(invite, now);
              return (
                <tr key={invite.id} className="border-b border-lab-border last:border-0">
                  <td className="px-4 py-3 text-lab-text">{invite.email ?? <span className="text-lab-text-muted">qualquer</span>}</td>
                  <td className="px-4 py-3 text-lab-text-dim">{invite.workspace ? `Membro de ${invite.workspace.name}` : "Workspace novo"}</td>
                  <td className={`px-4 py-3 ${status.className}`}>{status.label}</td>
                  <td className="px-4 py-3 font-mono text-xs text-lab-text-dim">{dateFormat.format(invite.expiresAt)}</td>
                  <td className="px-4 py-3 text-right">
                    {status.label === "Aberto" ? (
                      <form action={revokeInviteAction}>
                        <input type="hidden" name="id" value={invite.id} />
                        <Button type="submit" variant="ghost" size="sm">
                          Revogar
                        </Button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </main>
  );
}
