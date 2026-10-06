"use client";
import { costText } from "@/lib/plan";
import Image from "next/image";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { TRENDS, motionEstimate, type MotionBrief } from "@/lib/motion";
import { createMotion } from "./actions";
type Media = {
  id: string;
  url: string;
  name: string;
  durationSec: number | null;
};
export function MotionForm({
  trend,
  characters,
  images,
  videos,
  initial,
  rate,
}: {
  trend: (typeof TRENDS)[number];
  characters: { id: string; name: string }[];
  images: Media[];
  videos: Media[];
  initial?: MotionBrief;
  rate: number;
}) {
  const [state, action, pending] = useActionState(createMotion, "");
  const [sourceId, setSource] = useState(
    initial?.sourceId ?? videos[0]?.id ?? "",
  );
  const [refs, setRefs] = useState<string[]>(initial?.referenceIds ?? []);
  const [resolution, setResolution] = useState<MotionBrief["resolution"]>(
    initial?.resolution ?? "720p",
  );
  const source = videos.find((v) => v.id === sourceId);
  const field =
    "min-h-11 w-full rounded-control border border-lab-border bg-lab-surface-2 p-3 text-body-sm";
  const usd = source?.durationSec
    ? motionEstimate(source.durationSec, resolution).usd
    : null;
  const cost = usd === null ? null : usd * rate;
  return (
    <form action={action} className="grid gap-6">
      <input type="hidden" name="trend" value={trend.id} />
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="grid content-start gap-4 rounded-lab border border-lab-border bg-lab-surface-1 p-5">
          <h2 className="font-display text-xl">1. Movimento de referência</h2>
          <label className="grid gap-2 text-body-sm">
            Seu vídeo
            <select
              required
              name="sourceId"
              value={sourceId}
              onChange={(e) => setSource(e.target.value)}
              className={field}
            >
              <option value="">Escolha um vídeo importado</option>
              {videos.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {v.durationSec?.toFixed(1)}s
                </option>
              ))}
            </select>
          </label>
          {source && (
            <video
              key={source.id}
              controls
              preload="metadata"
              src={source.url}
              className="max-h-80 w-full rounded-lg bg-black"
            />
          )}
          <p className="text-body-sm text-lab-text-muted">
            O vídeo define a ação, a câmera e o tempo. Os exemplos desta página
            são estruturas; importe o vídeo que deseja recriar.
          </p>
        </section>
        <section className="grid content-start gap-4 rounded-lab border border-lab-border bg-lab-surface-1 p-5">
          <h2 className="font-display text-xl">2. Quem entra na cena?</h2>
          {trend.roles.map((role, index) => (
            <label key={role} className="grid gap-2 text-body-sm">
              {role}
              {index > 0 ? " (opcional)" : ""}
              <select
                name="referenceIds"
                required={index === 0}
                value={refs[index] ?? ""}
                onChange={(e) =>
                  setRefs((current) => {
                    const next = [...current];
                    next[index] = e.target.value;
                    return next;
                  })
                }
                className={field}
              >
                <option value="">
                  {index === 0 ? "Escolha uma imagem" : "Não usar"}
                </option>
                {images.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              {refs[index] && images.find((a) => a.id === refs[index]) && (
                <Image
                  unoptimized
                  src={images.find((a) => a.id === refs[index])!.url}
                  width={96}
                  height={96}
                  alt={`Referência: ${role}`}
                  className="h-24 w-24 rounded-lg object-cover"
                />
              )}
            </label>
          ))}
          <p className="text-caption text-lab-text-muted">
            As referências são enviadas nessa ordem. Descreva a posição de cada
            personagem nas instruções; a correspondência depende do resultado do
            modelo.
          </p>
        </section>
      </div>
      <section className="grid gap-4 rounded-lab border border-lab-border bg-lab-surface-1 p-5">
        <h2 className="font-display text-xl">3. Prepare a recriação</h2>
        <label className="grid gap-2 text-body-sm">
          Título
          <input
            name="title"
            required
            maxLength={120}
            defaultValue={trend.name}
            className={field}
          />
        </label>
        <label className="grid gap-2 text-body-sm">
          Organizar no personagem
          <select name="influencerId" required className={field}>
            {characters.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-body-sm">
          Instruções de cena
          <textarea
            name="prompt"
            rows={5}
            maxLength={2000}
            defaultValue={initial?.prompt ?? trend.prompt}
            className={field}
          />
        </label>
        <label className="grid gap-2 text-body-sm">
          Resolução
          <select
            name="resolution"
            value={resolution}
            onChange={(e) =>
              setResolution(e.target.value as MotionBrief["resolution"])
            }
            className={field}
          >
            <option value="480p">480p · Econômico</option>
            <option value="720p">720p · Equilibrado</option>
            <option value="1080p">1080p · Alta resolução</option>
          </select>
        </label>
        <p className="text-body-sm text-lab-text-dim">
          {cost === null
            ? "Selecione o vídeo para estimar a geração."
            : `Estimativa de geração: ~${costText(cost)}. A duração é arredondada para cima em segundos.`}{" "}
          Salvar este rascunho é gratuito. A geração será confirmada na próxima
          tela.
        </p>
        <Button
          loading={pending}
          disabled={!characters.length || !videos.length || !images.length}
          className="justify-self-start"
          size="lg"
        >
          Salvar recriação
        </Button>
        {state && (
          <p role="alert" className="text-body-sm text-lab-danger">
            {state}
          </p>
        )}
      </section>
    </form>
  );
}
