"use client";
import { useActionState } from "react";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { saveInfluencer } from "./profile-actions";
export function ProfileForm({
  influencer,
}: {
  influencer: {
    id: string;
    name: string;
    niche: string;
    tone: string;
    persona: string;
    visualSignature: string;
  };
}) {
  const [state, action, pending] = useActionState(
    saveInfluencer.bind(null, influencer.id),
    { error: "", message: "" },
  );
  return (
    <form
      action={action}
      className="grid max-w-form gap-4 rounded-lab border border-lab-border bg-lab-surface-1 p-5"
    >
      <h2 className="font-display text-xl">Identidade do personagem</h2>
      <p className="text-body-sm leading-6 text-lab-text-dim">
        Edite o briefing para as próximas gerações. Alterar a descrição não
        modifica imagens ou vídeos que já estão prontos.
      </p>
      <Field label="Nome" htmlFor="profile-name">
        <Input
          id="profile-name"
          name="name"
          defaultValue={influencer.name}
          maxLength={60}
          required
        />
      </Field>
      <Field label="Nicho / categoria" htmlFor="profile-niche">
        <Input
          id="profile-niche"
          name="niche"
          list="niche-options"
          defaultValue={influencer.niche}
          maxLength={80}
          required
        />
        <datalist id="niche-options">
          {[
            "TikTok Shop",
            "Lifestyle",
            "Beleza",
            "Moda",
            "Tecnologia",
            "Fitness",
            "Educação",
          ].map((item) => (
            <option key={item} value={item} />
          ))}
        </datalist>
      </Field>
      <Field label="Tom de voz" htmlFor="profile-tone">
        <Input
          id="profile-tone"
          name="tone"
          defaultValue={influencer.tone}
          maxLength={80}
          required
        />
      </Field>
      <Field label="Personalidade e aparência" htmlFor="profile-persona">
        <Textarea
          id="profile-persona"
          name="persona"
          defaultValue={influencer.persona}
          maxLength={2000}
          rows={6}
          className="font-sans text-body-sm"
        />
      </Field>
      <Field label="Assinatura visual" htmlFor="profile-signature">
        <Textarea
          id="profile-signature"
          name="visualSignature"
          defaultValue={influencer.visualSignature}
          maxLength={500}
          rows={3}
          className="font-sans text-body-sm"
        />
      </Field>
      <Button size="lg" className="justify-self-start" loading={pending}>
        Salvar perfil
      </Button>
      {state.error || state.message ? (
        <p
          role={state.error ? "alert" : "status"}
          className={`text-body-sm ${state.error ? "text-lab-danger" : "text-lab-success"}`}
        >
          {state.error || state.message}
        </p>
      ) : null}
    </form>
  );
}
