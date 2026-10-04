import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { createInfluencer } from "../../actions";

export default function NewInfluencerPage() {
  return <div className="mx-auto grid max-w-form gap-6">
    <Link href="/" className="text-body-sm text-lab-text-dim">← Influencers</Link>
    <div><h1 className="font-display text-h1">Novo influencer</h1><p className="mt-2 text-body-sm text-lab-text-dim">Defina quem ele é. Depois você cria o personagem e seus conteúdos.</p></div>
    <form action={createInfluencer} className="grid gap-4 rounded-lab border border-lab-border bg-lab-surface-1 p-5">
      <Field label="Nome" htmlFor="name"><Input id="name" name="name" required maxLength={60} className="h-11" /></Field>
      <Field label="Nicho" htmlFor="niche"><Input id="niche" name="niche" required maxLength={80} className="h-11" placeholder="Ex.: tecnologia e criatividade" /></Field>
      <Field label="Tom de voz" htmlFor="tone"><Input id="tone" name="tone" required maxLength={80} className="h-11" placeholder="Ex.: claro e bem-humorado" /></Field>
      <Field label="Características visuais (opcional)" htmlFor="visualSignature"><Textarea id="visualSignature" name="visualSignature" maxLength={300} /></Field>
      <Field label="Descrição (opcional)" htmlFor="persona"><Textarea id="persona" name="persona" maxLength={1000} /></Field>
      <Button size="lg" className="justify-self-start">Criar influencer</Button>
    </form>
  </div>;
}
