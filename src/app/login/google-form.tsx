import { Button } from "@/components/ui/button";

// Google sign-in, kept next to e-mail and password (owner powers need a Google session). Terms are accepted
// after the first sign-in, on "Antes de começar".
export function GoogleSignIn({ action, enabled }: { action: () => void; enabled: boolean }) {
  return (
    <form action={action}>
      <Button variant="secondary" disabled={!enabled} className="h-12 w-full text-body">
        <span aria-hidden className="flex size-5 items-center justify-center rounded-full bg-lab-text text-xs font-bold text-lab-bg">G</span>
        Continuar com Google
      </Button>
    </form>
  );
}
