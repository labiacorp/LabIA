import Link from "next/link";
import { PageHeading } from "@/components/app/page-heading";
import { requireOwner } from "@/lib/owner";
import { loadPromptTemplates, PROMPT_DEFAULTS, PROMPT_KEYS, PROMPT_MAX } from "@/lib/prompts";
import { PromptEditor } from "./prompt-editor";

export const metadata = { title: "Prompts · Admin · LabIA" };
export const dynamic = "force-dynamic";

export default async function PromptsPage() {
  await requireOwner();
  const overrides = await loadPromptTemplates();
  return <div className="mx-auto max-w-content">
    <PageHeading title="Prompts" description="The text the app writes around what users type. What you save here replaces the default from the next generation on; reset brings the default back. Users never see these prompts."
      action={<Link href="/admin" className="text-body-sm underline">Back to Admin</Link>} />
    <ul className="grid gap-4">
      {PROMPT_KEYS.map((key) => {
        const definition = PROMPT_DEFAULTS[key];
        return <li key={key} className="rounded-lab border border-lab-border bg-lab-surface-1 p-4">
          <PromptEditor promptKey={key} label={definition.label} where={definition.where} vars={definition.vars} defaultText={definition.text} text={overrides[key] ?? definition.text} custom={overrides[key] !== undefined} max={PROMPT_MAX} />
        </li>;
      })}
    </ul>
  </div>;
}
