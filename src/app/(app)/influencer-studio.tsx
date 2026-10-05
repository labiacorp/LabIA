"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { ArrowRight, Check, ChevronDown, Clapperboard, ImageIcon, LayoutGrid, Shuffle, SlidersHorizontal, Sparkles, UserRound, X } from "lucide-react";

import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { CostChip } from "@/components/ui/cost-chip";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { MOTION_PRESETS, presetImage, selectionValues, STUDIO_GROUPS, STUDIO_MULTI_GROUPS, STUDIO_PRESETS, type StudioSelection } from "@/lib/studio";
import { createStudioCharacter, createStudioMotion } from "./studio-actions";

export type StudioInfluencer = {
  id: string; name: string; niche: string; tone: string; persona: string; visualSignature: string;
  faceUrl: string | null; sheetUrl: string | null; hasFace: boolean; contentCount: number;
};
export type StudioHistory = { id: string; influencerId: string; title: string; influencerName: string; image: string | null; count: number };
type Preset = (typeof STUDIO_PRESETS)[number];
type Preview = { type: "preset"; preset: Preset } | { type: "owned"; influencer: StudioInfluencer };

export function InfluencerStudio({ influencers, history, initialBuilderOpen = false }: { influencers: StudioInfluencer[]; history: StudioHistory[]; initialBuilderOpen?: boolean }) {
  const [mode, setMode] = useState<"character" | "motion">("character");
  const [view, setView] = useState<"explore" | "history">("explore");
  const [source, setSource] = useState<"presets" | "mine" | "motion">("presets");
  const [mobileOpen, setMobileOpen] = useState(initialBuilderOpen);
  const [selections, setSelections] = useState<StudioSelection>({ character: "Natural", age: "Adult" });
  const [brief, setBrief] = useState({ name: "", niche: "", tone: "", visualSignature: "", persona: "" });
  const [preview, setPreview] = useState<Preview | null>(null);
  const [motionId, setMotionId] = useState("talk");
  const [influencerId, setInfluencerId] = useState(influencers.find((item) => item.hasFace)?.id ?? "");
  const [title, setTitle] = useState("");
  const [scene, setScene] = useState("");
  const [characterState, characterAction, characterPending] = useActionState(createStudioCharacter, {});
  const [motionState, motionAction, motionPending] = useActionState(createStudioMotion, {});
  const dialog = useRef<HTMLDialogElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);
  const readyInfluencers = influencers.filter((item) => item.hasFace);
  const motion = MOTION_PRESETS.find((item) => item.id === motionId)!;

  useEffect(() => {
    if (preview) dialog.current?.showModal();
    else dialog.current?.close();
  }, [preview]);

  function applyPreset(preset: Preset) {
    setSelections({ ...preset.selection });
    setBrief({ name: preset.name, niche: preset.niche, tone: preset.tone, visualSignature: preset.signature, persona: "" });
    setMode("character"); setMobileOpen(true); setPreview(null);
    nameInput.current?.focus();
    document.getElementById("studio-builder")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function randomize() {
    setSelections(Object.fromEntries(STUDIO_GROUPS.map((category) => [category.id, category.options[Math.floor(Math.random() * category.options.length)].value])));
  }

  function chooseMotion(id: string) {
    setMotionId(id); setMode("motion"); setMobileOpen(true);
    document.getElementById("studio-builder")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  const previewTitle = preview?.type === "preset" ? preview.preset.name : preview?.influencer.name;
  const previewImage = preview?.type === "preset" ? presetImage(preview.preset.image) : preview?.influencer.sheetUrl ?? preview?.influencer.faceUrl;

  return (
    <div className="studio-layout">
      <aside id="studio-builder" className="studio-panel" data-mobile-open={mobileOpen} aria-label="Configuração do estúdio">
        <div className="studio-panel-header">
          <Button type="button" variant="ghost" size="sm" className="studio-mobile-toggle mb-2" onClick={() => setMobileOpen(false)}><X />Voltar à galeria</Button>
          <p className="text-caption text-lab-text-dim">Dê vida ao seu personagem</p>
          <h1 className="font-display text-h2 font-bold tracking-tight">Estúdio de personagens</h1>
          <div className="studio-segmented" role="tablist" aria-label="Modo de criação">
            <button id="character-mode" role="tab" aria-selected={mode === "character"} aria-controls="character-panel" onClick={() => setMode("character")}><UserRound size={16} />Personagem</button>
            <button id="motion-mode" role="tab" aria-selected={mode === "motion"} aria-controls="motion-panel" onClick={() => setMode("motion")}><Clapperboard size={16} />Movimento</button>
          </div>
        </div>
        {mode === "character" ? (
          <form id="character-panel" role="tabpanel" aria-labelledby="character-mode" action={characterAction} aria-busy={characterPending} className="studio-form">
            <div className="studio-panel-scroll">
              <div className="studio-brief">
                <div className="flex items-center gap-2 text-body-sm font-medium"><Sparkles size={16} />Quem você vai criar?</div>
                <Field label="Nome" htmlFor="studio-name"><Input ref={nameInput} id="studio-name" name="name" required maxLength={60} placeholder="Nome do influencer" value={brief.name} onChange={(e) => setBrief({ ...brief, name: e.target.value })} /></Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Nicho" htmlFor="studio-niche"><Input id="studio-niche" name="niche" required maxLength={80} placeholder="Moda, finanças…" value={brief.niche} onChange={(e) => setBrief({ ...brief, niche: e.target.value })} /></Field>
                  <Field label="Tom de voz" htmlFor="studio-tone"><Input id="studio-tone" name="tone" required maxLength={80} placeholder="Direto, divertido…" value={brief.tone} onChange={(e) => setBrief({ ...brief, tone: e.target.value })} /></Field>
                </div>
              </div>
              <input type="hidden" name="selections" value={JSON.stringify(selections)} />
              {STUDIO_GROUPS.map((category, index) => (
                <details key={category.id} className="studio-category" open={index === 0}>
                  <summary><span>{category.label}<small> · {category.options.length}</small></span><ChevronDown size={16} /></summary>
                  <div className={category.id === "character" ? "studio-character-types" : "studio-options"} role="group" aria-label={category.label}>
                    {category.options.map((option) => (
                      <button type="button" key={option.value} aria-pressed={selectionValues(selections[category.id]).includes(option.value)} onClick={() => setSelections((current) => {
                        const next = { ...current };
                        if (STUDIO_MULTI_GROUPS.has(category.id)) {
                          const previous = selectionValues(current[category.id]);
                          const values = previous.includes(option.value) ? previous.filter((value) => value !== option.value) : [...previous, option.value];
                          if (values.length) next[category.id] = values;
                          else delete next[category.id];
                        } else if (next[category.id] === option.value) delete next[category.id];
                        else next[category.id] = option.value;
                        return next;
                      })}>
                        {category.id === "character" ? <span aria-hidden className={`studio-type-icon studio-type-${option.value.toLowerCase()}`}><UserRound size={32} /></span> : null}
                        {option.label}{selectionValues(selections[category.id]).includes(option.value) ? <Check size={12} aria-hidden /> : null}
                      </button>
                    ))}
                  </div>
                  {selections[category.id] ? <span className="studio-selection-caption">{selectionValues(selections[category.id]).map((value) => category.options.find((option) => option.value === value)?.label).join(" · ")}</span> : null}
                </details>
              ))}
              <details className="studio-category">
                <summary><span>Seu toque pessoal</span><ChevronDown size={16} /></summary>
                <div className="grid gap-4 px-3 pb-4">
                  <Field label="Assinatura visual" htmlFor="studio-signature"><Textarea id="studio-signature" name="visualSignature" maxLength={300} rows={3} value={brief.visualSignature} onChange={(e) => setBrief({ ...brief, visualSignature: e.target.value })} placeholder="O detalhe que sempre acompanha o personagem" /></Field>
                  <Field label="Personalidade" htmlFor="studio-persona"><Textarea id="studio-persona" name="persona" maxLength={400} rows={3} value={brief.persona} onChange={(e) => setBrief({ ...brief, persona: e.target.value })} placeholder="Como pensa, fala e se comporta" /></Field>
                </div>
              </details>
            </div>
            <div className="studio-panel-footer">
              {characterState.error ? <Alert variant="error" title={characterState.error} /> : null}
              <div className="flex items-center justify-between gap-2"><Button type="button" variant="secondary" size="sm" onClick={randomize}><Shuffle />Sortear visual</Button><CostChip state="free" value={0} prefix="cadastro" /></div>
              <Button size="lg" loading={characterPending}>Criar personagem<ArrowRight /></Button>
              <p className="text-caption text-lab-text-muted">Depois, aprove o custo para gerar a ficha e os retratos.</p>
            </div>
          </form>
        ) : (
          <form id="motion-panel" role="tabpanel" aria-labelledby="motion-mode" action={motionAction} aria-busy={motionPending} className="studio-form">
            <div className="studio-panel-scroll grid content-start gap-5 p-4">
              <div className="studio-motion-hero"><Clapperboard size={36} /><span>SEU PERSONAGEM EM CENA</span><p>3 cenas de 5 segundos.<br />Um vídeo de 15 segundos.</p></div>
              <Field label="Personagem" htmlFor="motion-influencer"><Select id="motion-influencer" name="influencerId" required value={influencerId} onChange={(e) => setInfluencerId(e.target.value)}><option value="">Selecione um personagem</option>{readyInfluencers.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</Select></Field>
              {readyInfluencers.length === 0 ? <Alert title="Primeiro, prepare o personagem">Crie a ficha e os retratos. Com o rosto pronto, você poderá colocá-lo em movimento.{influencers[0] ? <Link className="mt-2 block underline" href={`/i/${influencers[0].id}?aba=personagem`}>Preparar {influencers[0].name}</Link> : <button type="button" className="mt-2 underline" onClick={() => setMode("character")}>Criar personagem</button>}</Alert> : null}
              <Field label="Movimento" htmlFor="motion-preset"><Select id="motion-preset" value={motionId} onChange={(e) => setMotionId(e.target.value)}>{MOTION_PRESETS.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</Select></Field>
              <p className="text-caption text-lab-text-dim">{motion.description}</p>
              <Field label="Título" htmlFor="motion-title"><Input id="motion-title" name="title" required maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Como este vídeo vai se chamar?" /></Field>
              <Field label="O que acontece na cena?" htmlFor="motion-scene"><Textarea id="motion-scene" maxLength={1500} value={scene} onChange={(e) => setScene(e.target.value)} rows={4} placeholder="Lugar, ação, roupa e intenção" /></Field>
              <input type="hidden" name="idea" value={`${scene.trim()}\nMovimento: ${motion.label}. ${motion.description}`} />
              <p className="text-caption text-lab-text-muted">Você revisa a cena e aprova os custos de imagem e vídeo na próxima tela.</p>
            </div>
            <div className="studio-panel-footer">
              {motionState.error ? <Alert variant="error" title={motionState.error} /> : null}
              <CostChip state="free" value={0} prefix="rascunho" />
              <Button size="lg" loading={motionPending} disabled={readyInfluencers.length === 0}>Criar conteúdo<ArrowRight /></Button>
            </div>
          </form>
        )}
      </aside>

      <section className="studio-workspace" aria-label="Galeria do estúdio">
        <div className="studio-workspace-toolbar">
          <div className="studio-view-tabs" role="tablist" aria-label="Visualização do estúdio">
            <button id="explore-tab" role="tab" aria-selected={view === "explore"} aria-controls="studio-gallery" onClick={() => setView("explore")}><LayoutGrid size={16} />Explorar</button>
            <button id="history-tab" role="tab" aria-selected={view === "history"} aria-controls="studio-gallery" onClick={() => setView("history")}>Histórico<span>{history.length}</span></button>
          </div>
          <Button type="button" variant="secondary" size="sm" className="studio-mobile-toggle" aria-expanded={mobileOpen} aria-controls="studio-builder" onClick={() => setMobileOpen(!mobileOpen)}><SlidersHorizontal />{mobileOpen ? "Ver galeria" : "Configurar"}</Button>
        </div>
        <div id="studio-gallery" role="tabpanel" aria-labelledby={view === "explore" ? "explore-tab" : "history-tab"}>
          {view === "explore" ? <>
            <div className="studio-hero"><span className="studio-eyebrow"><Sparkles size={14} />A PRIMEIRA FERRAMENTA DO LABIA</span><h2>SEU INFLUENCER.<br /><span>SUA PRÓXIMA HISTÓRIA.</span></h2><p>Escolha o rosto, o estilo e a personalidade.<br className="hidden sm:block" /> Depois, transforme seu personagem em conteúdo.</p><Button variant="secondary" size="sm" className="studio-mobile-toggle mt-4" onClick={() => setMobileOpen(true)}>Começar a criar<ArrowRight /></Button></div>
            <div className="studio-source-tabs" role="tablist" aria-label="Fonte da galeria">
              <button id="presets-tab" role="tab" aria-controls="studio-source" aria-selected={source === "presets"} onClick={() => setSource("presets")}>Personagens</button>
              <button id="mine-tab" role="tab" aria-controls="studio-source" aria-selected={source === "mine"} onClick={() => setSource("mine")}>Meus influencers<span>{influencers.length}</span></button>
              <button id="motions-tab" role="tab" aria-controls="studio-source" aria-selected={source === "motion"} onClick={() => setSource("motion")}>Movimentos</button>
            </div>
            <div id="studio-source" role="tabpanel" aria-labelledby={source === "presets" ? "presets-tab" : source === "mine" ? "mine-tab" : "motions-tab"}>
              {source === "presets" ? <><div className="studio-card-grid">{STUDIO_PRESETS.map((preset, index) => <article className="studio-card" key={preset.id}>
                <button className="studio-card-media" aria-label={`Ver ficha de ${preset.name}`} onClick={() => setPreview({ type: "preset", preset })}>
                  {/* Public reference preview; never presented as a generated LabIA asset. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={presetImage(preset.image)} alt={`Referência visual para ${preset.name}`} loading={index < 3 ? "eager" : "lazy"} />
                  <span className="studio-card-number">{String(index + 1).padStart(2, "0")}</span><span className="studio-card-preview"><ImageIcon size={14} />Ver ficha</span>
                </button>
                <div className="studio-card-info"><div><h3>{preset.name}</h3><p>{preset.niche}</p></div><button className="studio-recreate" onClick={() => applyPreset(preset)} aria-label={`Usar modelo ${preset.name}`}><Sparkles size={14} />Usar modelo</button></div>
              </article>)}</div><p className="studio-reference-note">Prévia visual: <a href="https://higgsfield.ai/ai-influencer-studio" target="_blank" rel="noreferrer">Higgsfield</a>. Os modelos preenchem seu briefing; o personagem gerado terá identidade própria.</p></> : source === "mine" ? influencers.length ? <div className="studio-card-grid">{influencers.map((item) => <article className="studio-card" key={item.id}>
                <button className="studio-card-media" aria-label={`Ver ficha de ${item.name}`} onClick={() => setPreview({ type: "owned", influencer: item })}>{item.faceUrl ? <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.faceUrl} alt={item.name} loading="lazy" />
                </> : <div className="studio-no-face"><UserRound size={48} /><span>Rosto em preparação</span></div>}<span className="studio-card-preview"><ImageIcon size={14} />Ver ficha</span></button>
                <div className="studio-card-info"><div><h3>{item.name}</h3><p>{item.contentCount} conteúdos · {item.niche}</p></div><Link className="studio-recreate" href={`/i/${item.id}`}>Abrir<ArrowRight size={14} /></Link></div>
              </article>)}</div> : <StudioEmpty title="Seu primeiro influencer começa aqui" description="Configure um personagem ou use um dos modelos para começar." action={<Button variant="secondary" onClick={() => { setSource("presets"); setMobileOpen(true); }}>Escolher personagem</Button>} /> : <div className="studio-motion-grid">{MOTION_PRESETS.map((item, index) => <button key={item.id} className="studio-motion-card" onClick={() => chooseMotion(item.id)}><div className={`studio-motion-art studio-motion-art-${index}`}><Clapperboard size={48} /><span>0{index + 1}</span></div><h3>{item.label}</h3><p>{item.description}</p><span className="studio-motion-cta">Usar movimento<ArrowRight size={16} /></span></button>)}</div>}
            </div>
          </> : history.length ? <><div className="studio-history-heading"><h2 className="font-display text-h2">Seus conteúdos</h2><p className="text-body-sm text-lab-text-dim">Rascunhos e gerações, sempre dentro do seu influencer.</p></div><div className="studio-card-grid">{history.map((item) => <Link key={item.id} href={`/i/${item.influencerId}/c/${item.id}`} className="studio-card"><div className="studio-card-media">{item.image ? <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image} alt={item.title} loading="lazy" />
          </> : <div className="studio-no-face"><Clapperboard size={40} /><span>Rascunho</span></div>}</div><div className="studio-card-info"><div><h3>{item.title}</h3><p>{item.influencerName} · {item.count} etapas concluídas</p></div><ArrowRight size={16} /></div></Link>)}</div></> : <StudioEmpty title="Sua próxima história vai aparecer aqui" description="Crie um personagem e prepare seu primeiro conteúdo. Todas as etapas ficam salvas." action={<Button variant="secondary" onClick={() => setView("explore")}>Explorar personagens</Button>} />}
        </div>
      </section>

      <dialog ref={dialog} className="studio-dialog" aria-labelledby="studio-preview-title" onClose={() => setPreview(null)} onClick={(event) => { if (event.target === event.currentTarget) setPreview(null); }}>
        <div className="studio-dialog-header"><h2 id="studio-preview-title" className="font-display text-h2">{previewTitle}</h2><Button variant="ghost" size="icon-lg" aria-label="Fechar ficha" onClick={() => setPreview(null)}><X /></Button></div>
        {previewImage ? <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img className="studio-sheet-preview" src={previewImage} alt={`Ficha de ${previewTitle}`} />
        </> : <div className="studio-no-face p-10"><UserRound size={48} /><span>A ficha ainda não foi gerada.</span></div>}
        {preview?.type === "preset" ? <div className="studio-dialog-details"><p className="studio-eyebrow">PARÂMETROS DO PERSONAGEM</p><div className="studio-traits">{STUDIO_GROUPS.flatMap((category) => { return selectionValues(preview.preset.selection[category.id]).map((value) => <span key={`${category.id}-${value}`}>{category.options.find((option) => option.value === value)?.label}</span>); })}</div><p className="text-body-sm text-lab-text-dim">{preview.preset.signature}</p><p className="text-caption text-lab-text-muted">Imagem de referência do Higgsfield. O modelo configura a aparência; não copia este rosto.</p><Button size="lg" onClick={() => applyPreset(preview.preset)}><Sparkles />Usar este modelo</Button></div> : preview ? <div className="studio-dialog-details"><p className="text-body-sm text-lab-text-dim">{preview.influencer.visualSignature || preview.influencer.niche}</p><p className="whitespace-pre-wrap text-caption text-lab-text-muted">{preview.influencer.persona}</p><Link href={`/i/${preview.influencer.id}?aba=personagem`} className={buttonVariants({ size: "lg" })}>Abrir personagem<ArrowRight size={16} /></Link></div> : null}
      </dialog>
    </div>
  );
}

function StudioEmpty({ title, description, action }: { title: string; description: string; action: React.ReactNode }) {
  return <div className="studio-empty"><UserRound size={40} /><h2 className="font-display text-h2">{title}</h2><p className="max-w-md text-body-sm text-lab-text-dim">{description}</p>{action}</div>;
}
