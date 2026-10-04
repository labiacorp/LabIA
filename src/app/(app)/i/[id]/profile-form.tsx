"use client";
import Image from "next/image";
import { useActionState, useState } from "react";
import { Field, Input, Textarea } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { saveInfluencer } from "./profile-actions";
export function ProfileForm({
  influencer,
  references,
}: {
  references: { id: string; url: string; label: string }[];
  influencer: {
    id: string;
    faceAssetId: string | null;
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
  const [reference, setReference] = useState(influencer.faceAssetId ?? "");
  const selectedReference = references.find((asset) => asset.id === reference);
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
      {references.length > 0 && (
        <label className="grid gap-2 text-body-sm">
          Retrato de referência
          <select
            name="faceAssetId"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            className="min-h-11 rounded-control border border-lab-border bg-lab-surface-2 px-3"
          >
            <option value="" disabled>
              Escolha um retrato pronto
            </option>
            {references.map((asset) => (
              <option key={asset.id} value={asset.id}>
                {asset.label}
              </option>
            ))}
          </select>
          <span className="text-caption text-lab-text-muted">
            Usado nas próximas cenas. As mídias existentes continuam iguais.
          </span>
        </label>
      )}
      {selectedReference && (
        <Image
          src={selectedReference.url}
          alt="Retrato selecionado para as próximas cenas"
          width={128}
          height={160}
          unoptimized
          className="h-40 w-32 rounded-lg object-cover"
        />
      )}
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
