import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { REFERRAL_BONUS_BRL } from "@/lib/referral-rules";
import { balanceCredits, creditsText } from "@/lib/plan";
export default async function InvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ invalid?: string }>;
}) {
  const { invalid } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 p-6">
      <p className="text-caption text-lab-text-muted">Convite</p>
      <h1 className="font-display text-3xl">
        {invalid
          ? "Este link de indicação não está disponível"
          : "Seu convite para a LabIA chegou"}
      </h1>
      <p className="text-body-lg text-lab-text-dim">
        {invalid
          ? "Peça um novo link a quem indicou a LabIA. Você também pode continuar pelo acesso habitual."
          : `Alguém que já cria na LabIA convidou você. Crie sua conta e, no primeiro mês pago, ganhe ${creditsText(balanceCredits(REFERRAL_BONUS_BRL))} a mais.`}
      </p>
      {!invalid && (
        <p className="text-body-sm leading-6 text-lab-text-muted">
          A LabIA está em beta fechada: este convite libera a entrada sem código
          enquanto quem convidou tiver convites livres. Se eles acabarem, peça o
          código à equipe.
        </p>
      )}
      <Link href="/login" className={buttonVariants({ size: "lg" })}>
        Criar minha conta
      </Link>
      <Link href="/" className="text-center text-body-sm underline">
        Conhecer a LabIA
      </Link>
    </main>
  );
}
