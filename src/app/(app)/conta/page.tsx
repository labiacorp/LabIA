import { getReferralCode } from "@/lib/referrals";
import { ReferralLink } from "./referral-link";
import { PageHeading } from "@/components/app/page-heading";
import { Button, buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { logout } from "../actions";
import { AccountForm } from "./account-form";
import { AvatarForm } from "./avatar-form";
import { SessionControls } from "./session-controls";

export default async function AccountPage() {
  const userId = await requireUserId();
  const [user, referralCode, referralCount] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { name: true, email: true, avatarUpdatedAt: true } }),
    getReferralCode(userId),
    prisma.user.count({ where: { referredById: userId } }),
  ]);
  return (
    <div className="mx-auto max-w-content">
      <PageHeading title="Minha conta" description="Seu perfil e seu acesso à LabIA." />
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
        <section className="workspace-panel">
          <h2 className="mb-6 font-display text-xl">Perfil</h2>
          <AvatarForm name={user.name || user.email} version={user.avatarUpdatedAt?.getTime()} />
          <AccountForm name={user.name || user.email.split("@")[0]} />
          <div className="mt-6 border-t border-lab-border pt-5"><p className="text-caption text-lab-text-muted">E-mail de acesso</p><p className="mt-2 break-all text-body-sm">{user.email}</p></div>
        </section>
        <div className="grid gap-6">
          <section className="workspace-panel" id="indicacoes">
            <p className="section-eyebrow">CRIE JUNTO</p>
            <h2 className="font-display text-xl">Convide alguém para a LabIA</h2>
            <p className="my-3 text-body-sm leading-6 text-lab-text-dim">Compartilhe seu link com quem também cria.</p>
            <ReferralLink code={referralCode} />
            <p className="mt-4 text-caption text-lab-text-muted">{referralCount} {referralCount === 1 ? "nova conta pela sua indicação" : "novas contas pela sua indicação"}</p>
            <details className="mt-3 text-body-sm text-lab-text-dim"><summary className="cursor-pointer py-2">Como funciona</summary><p className="mt-2 leading-6">A indicação conta no primeiro cadastro em até 30 dias neste navegador. O acesso à beta depende da liberação da equipe. Indicações não concedem créditos.</p></details>
          </section>
          <section className="workspace-panel">
            <h2 className="font-display text-xl">Acesso e dados</h2>
            <details className="mt-4 border-b border-lab-border pb-4"><summary className="cursor-pointer py-2 text-body-sm">Sair de todos os navegadores</summary><p className="mt-2 text-body-sm leading-6 text-lab-text-dim">Você precisará entrar novamente em todos os dispositivos.</p><SessionControls /></details>
            <details className="mt-3"><summary className="cursor-pointer py-2 text-body-sm">Baixar meus dados</summary><p className="my-3 text-body-sm leading-6 text-lab-text-dim">Uma cópia do perfil, personagens, produções e extrato em JSON. Baixe imagens e vídeos pela biblioteca.</p><a href="/api/account/export" className={buttonVariants({ variant: "secondary" })}>Exportar dados</a></details>
            <form action={logout} className="mt-5 border-t border-lab-border pt-4"><Button variant="ghost">Sair desta conta</Button></form>
          </section>
        </div>
      </div>
    </div>
  );
}
