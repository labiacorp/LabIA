import { redirect } from "next/navigation";

import { auth, signIn } from "@/auth";
import { hasPass } from "@/lib/access";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default async function LoginPage() {
  if ((await auth())?.user) redirect("/");
  if (!(await hasPass())) redirect("/acesso");
  const devLogin = process.env.NODE_ENV === "development";

  return (
    <main className="mx-auto flex min-h-screen max-w-form flex-col justify-center gap-8 px-5">
      <div>
        <p className="lab-wordmark text-h1">Lab<span>IA</span></p>
        <p className="mt-3 text-body text-lab-text-dim">Crie conteúdo com influencers de IA, com o custo à vista antes de cada geração.</p>
      </div>
      <form action={async () => { "use server"; await signIn("google", { redirectTo: "/" }); }}>
        <Button size="lg" className="w-full">Entrar com Google</Button>
      </form>
      {devLogin ? (
        <form action={async (data: FormData) => { "use server"; await signIn("dev", { email: data.get("email"), redirectTo: "/" }); }} className="grid gap-2 border-t border-lab-border pt-5">
          <p className="font-mono text-eyebrow uppercase text-lab-text-muted">Só em desenvolvimento</p>
          <Input name="email" type="email" required placeholder="e-mail liberado" />
          <Button variant="secondary">Entrar sem Google</Button>
        </form>
      ) : null}
    </main>
  );
}
