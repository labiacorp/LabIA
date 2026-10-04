import { getReferralCode } from "@/lib/referrals";
import { ReferralLink } from "./referral-link";
import Link from "next/link";
import { PageHeading } from "@/components/app/page-heading";
import { Button, buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { dateLabel, currency } from "@/lib/platform";
import { logout } from "../actions";
import { AccountForm } from "./account-form";
import { AvatarForm } from "./avatar-form";
import { SessionControls } from "./session-controls";

function rollingWindowStart() {
  return new Date(Date.now() - 30 * 86400000);
}

export default async function AccountPage() {
  const userId = await requireUserId();
  // A rolling window avoids presenting a UTC month boundary as a Brazilian billing period.
  const since = rollingWindowStart();
  const [user, influencers, contents, assets, balance, usage] =
    await Promise.all([
      prisma.user.findUniqueOrThrow({
        where: { id: userId },
        select: {
          name: true,
          email: true,
          createdAt: true,
          bio: true,
          defaultAspectRatio: true,
          defaultContentView: true,
          avatarUpdatedAt: true,
        },
      }),
      prisma.influencer.count({ where: { userId } }),
      prisma.content.count({
        where: { influencer: { userId }, archivedAt: null },
      }),
      prisma.asset.count({ where: { userId } }),
      prisma.ledgerEntry.aggregate({
        where: { userId },
        _sum: { deltaBrl: true },
      }),
      prisma.ledgerEntry.aggregate({
        where: {
          userId,
          createdAt: { gte: since },
          reason: { in: ["SPEND", "REFUND"] },
        },
        _sum: { deltaBrl: true },
      }),
    ]);
  const [referralCode, referralCount] = await Promise.all([
    getReferralCode(userId),
    prisma.user.count({ where: { referredById: userId } }),
  ]);
  const card = "rounded-lab border border-lab-border bg-lab-surface-1 p-6";
  return (
    <div className="mx-auto max-w-content">
      <PageHeading
        title="Minha conta"
        description="Gerencie seu perfil, acompanhe seu uso e cuide do acesso à sua produção."
      />
      <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          ["Personagens", influencers, "/influenciadores"],
          ["Conteúdos ativos", contents, "/conteudos"],
          ["Mídias", assets, "/biblioteca"],
          [
            "Saldo disponível",
            currency(Number(balance._sum.deltaBrl ?? 0)),
            "/saldo",
          ],
        ].map(([label, value, href]) => (
          <Link
            key={label}
            href={String(href)}
            className={`${card} transition-colors hover:border-lab-text-muted`}
          >
            <span className="block text-body-sm text-lab-text-muted">
              {label}
            </span>
            <span className="mt-3 block break-words font-display text-2xl">
              {value}
            </span>
          </Link>
        ))}
      </div>
      <div className="grid items-start gap-5 lg:grid-cols-2">
        <div className="grid gap-5">
          <section className={card}>
            <h2 className="mb-5 font-display text-xl">Seu perfil</h2>
            <AvatarForm
              name={user.name || user.email}
              version={user.avatarUpdatedAt?.getTime()}
            />
            <AccountForm
              name={user.name}
              bio={user.bio}
              defaultAspectRatio={user.defaultAspectRatio}
              defaultContentView={user.defaultContentView}
            />
            <dl className="mt-6 grid gap-4 border-t border-lab-border pt-5 text-body-sm">
              <div>
                <dt className="text-lab-text-muted">E-mail de acesso</dt>
                <dd className="mt-1 break-all">{user.email}</dd>
              </div>
              <div>
                <dt className="text-lab-text-muted">Na LabIA desde</dt>
                <dd className="mt-1">{dateLabel(user.createdAt)}</dd>
              </div>
            </dl>
          </section>
          <section className={card}>
            <h2 className="font-display text-xl">Seus dados</h2>
            <p className="my-4 text-body-sm leading-6 text-lab-text-dim">
              Baixe uma cópia do perfil, personagens, ideias, links das mídias e
              movimentações da sua conta em JSON. Os arquivos de mídia podem ser
              baixados pela biblioteca.
            </p>
            <a
              href="/api/account/export"
              className={buttonVariants({ variant: "secondary", size: "lg" })}
            >
              Exportar meus dados
            </a>
          </section>
        </div>
        <div className="grid gap-5">
          <section className={card}>
            <h2 className="font-display text-xl">Uso e custos</h2>
            <p className="mt-4 text-body-sm text-lab-text-muted">
              Reservas líquidas nos últimos 30 dias
            </p>
            <p className="mt-2 font-display text-3xl">
              {currency(
                Number(usage._sum.deltaBrl ?? 0) === 0
                  ? 0
                  : -Number(usage._sum.deltaBrl),
              )}
            </p>
            <p className="my-4 text-body-sm leading-6 text-lab-text-dim">
              Total reservado para gerações, descontando reembolsos nesse
              período. Uma geração em andamento pode estar incluída. O custo
              final aparece em cada etapa.
            </p>
            <Link
              href="/saldo"
              className={buttonVariants({ variant: "secondary", size: "lg" })}
            >
              Conferir extrato
            </Link>
          </section>
          <section className={card} id="indicacoes">
            <h2 className="font-display text-xl">Indique a LabIA</h2>
            <p className="mt-4 font-display text-3xl">{referralCount}</p>
            <p className="text-body-sm text-lab-text-muted">
              Novas contas cadastradas pela sua indicação
            </p>
            <ReferralLink code={referralCode} />
            <p className="mt-3 text-body-sm leading-6 text-lab-text-dim">
              Compartilhe seu link. A indicação é registrada no primeiro
              cadastro em até 30 dias, neste navegador. Contas existentes não
              contam. O acesso à beta continua sujeito ao código e à liberação
              do e-mail; não há bônus ou créditos por indicação.
            </p>
          </section>
          <section className={card}>
            <h2 className="font-display text-xl">Acesso e segurança</h2>
            <p className="my-4 text-body-sm leading-6 text-lab-text-dim">
              Ao encerrar todas as sessões, o acesso será invalidado no
              servidor. Outros navegadores precisarão entrar novamente ao fazer
              a próxima solicitação.
            </p>
            <form action={logout}>
              <Button variant="secondary" size="lg">
                Sair deste navegador
              </Button>
            </form>
            <SessionControls />
          </section>
        </div>
      </div>
    </div>
  );
}
