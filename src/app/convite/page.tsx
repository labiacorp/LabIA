import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
export default async function InvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ invalid?: string }>;
}) {
  const { invalid } = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center gap-6 p-6">
      <p className="text-caption text-lab-text-muted">LABIA · INDICAÇÕES</p>
      <h1 className="font-display text-3xl">
        {invalid
          ? "Este link de indicação não está disponível"
          : "Sua próxima criação começa aqui"}
      </h1>
      <p className="text-body-lg text-lab-text-dim">
        {invalid
          ? "Peça um novo link a quem indicou a LabIA. Você também pode continuar pelo acesso habitual."
          : "Você recebeu uma indicação para conhecer a LabIA. Ao criar sua primeira conta neste navegador em até 30 dias, a indicação será registrada."}
      </p>
      <p className="text-body-sm leading-6 text-lab-text-muted">
        Estamos em beta fechada. A indicação não substitui o código de acesso
        nem a liberação do seu e-mail. Solicite esses dados à equipe antes de
        entrar. Não há bônus ou créditos neste programa.
      </p>
      <Link href="/login" className={buttonVariants({ size: "lg" })}>
        Continuar para o acesso
      </Link>
      <Link href="/" className="text-center text-body-sm underline">
        Conhecer a LabIA
      </Link>
    </main>
  );
}
