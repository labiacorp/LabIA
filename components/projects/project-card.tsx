import Link from "next/link";
import { FolderKanban, Image as ImageIcon, Video } from "lucide-react";

import { Badge, projectStatus } from "@/components/ui/badge";
import { CostChip } from "@/components/ui/cost-chip";
import { cn } from "@/lib/utils";

export type ProjectCardData = {
  id: string;
  name: string;
  type: string;
  status: string;
  aspectRatio: string;
  durationSeconds?: number | null;
  thumbnailUrl?: string | null;
  thumbnailType?: string | null;
  actualCostBrl?: number | null;
};

export function ProjectStatusBadge({ status, className }: { status: string; className?: string }) {
  const [variant, label] = projectStatus[status as keyof typeof projectStatus] ?? ["draft", "Não informado"];
  return <Badge variant={variant} dot className={cn("shrink-0 whitespace-nowrap", className)}>{label}</Badge>;
}

export function ProjectCard({ project, compact = false, dashboard = false }: { project: ProjectCardData; compact?: boolean; dashboard?: boolean }) {
  const type = project.type === "VIDEO" ? "Vídeo" : "Imagem";
  const mediaIcon = project.type === "VIDEO" ? <Video className="size-5" /> : <ImageIcon className="size-5" />;
  const cost = <CostChip state={project.actualCostBrl == null ? "pending" : "actual"} value={project.actualCostBrl ?? undefined} size="sm" className="border-0 bg-transparent px-0" />;

  if (dashboard) {
    return <Link href={`/projetos/${project.id}`} aria-label={`Abrir Projeto ${project.name}`} className="w-[140px] shrink-0 overflow-hidden rounded-lab border border-lab-border bg-lab-surface-1 transition-colors hover:border-lab-border-strong focus-visible:outline-none focus-visible:shadow-lab-focus md:w-auto md:min-w-0">
      <div className="lab-placeholder-media relative flex aspect-[4/5] items-center justify-center overflow-hidden font-mono text-caption text-lab-text-muted">
        {project.thumbnailUrl ? project.thumbnailType === "VIDEO" ? <video src={project.thumbnailUrl} muted preload="metadata" className="size-full object-cover" aria-label={project.name} /> :
          // eslint-disable-next-line @next/next/no-img-element
          <img src={project.thumbnailUrl} alt="" className="size-full object-cover" /> : <span>{project.aspectRatio}</span>}
        <ProjectStatusBadge status={project.status} className="absolute left-2 top-2 hidden h-[22px] bg-lab-scrim text-caption md:inline-flex" />
      </div>
      <div className="flex flex-col gap-1 p-2.5 md:gap-1.5 md:p-3">
        <h3 className="truncate text-[13px] font-medium md:text-sm">{project.name}</h3>
        <ProjectStatusBadge status={project.status} className="h-auto self-start border-0 bg-transparent px-0 text-caption md:hidden" />
        <div className="hidden items-center justify-between gap-2 md:flex"><span className="truncate font-mono text-caption text-lab-text-dim">{type} · {project.aspectRatio}</span>{cost}</div>
      </div>
    </Link>;
  }

  return (
    <Link href={`/projetos/${project.id}`} aria-label={`Abrir Projeto ${project.name}`} className={cn("group flex min-w-0 items-center gap-3 overflow-hidden rounded-node border border-lab-border bg-lab-surface-1 p-2.5 transition-colors hover:border-lab-border-strong focus-visible:outline-none focus-visible:shadow-lab-focus", !compact && "sm:block sm:p-0")}>
      <div className={cn("relative flex h-16 w-[52px] shrink-0 items-center justify-center overflow-hidden rounded-control bg-lab-surface-2 text-lab-text-muted", !compact && "sm:h-[200px] sm:w-full sm:rounded-none")}>
        {project.thumbnailUrl ? (
          project.thumbnailType === "VIDEO" ? <video src={project.thumbnailUrl} muted preload="metadata" className="size-full object-cover" aria-label={project.name} /> :
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={project.thumbnailUrl} alt="" className="size-full object-cover" />
        ) : <><span className={cn(!compact && "sm:hidden")}>{mediaIcon}</span>{!compact ? <span className="hidden flex-col items-center gap-2 sm:flex"><FolderKanban className="size-6" /><span className="font-mono text-caption">sem resultado</span></span> : null}</>}
        {!compact ? <ProjectStatusBadge status={project.status} className="absolute left-2 top-2 hidden h-[22px] bg-lab-bg/85 text-caption sm:inline-flex" /> : null}
      </div>
      <div className={cn("min-w-0 flex-1", !compact && "sm:px-3.5 sm:pb-3.5 sm:pt-3")}>
        <h3 className="truncate font-display text-sm font-medium sm:text-[15px]">{project.name}</h3>
        <div className={cn("mt-1 flex items-center gap-1.5", !compact && "sm:hidden")}><ProjectStatusBadge status={project.status} className="h-auto border-0 bg-transparent px-0 text-xs" /><span className="text-xs text-lab-text-dim">· {project.aspectRatio}</span></div>
        {!compact ? <div className="mt-2 hidden items-center justify-between gap-2 sm:flex"><span className="truncate font-mono text-caption text-lab-text-dim">{type} · {project.aspectRatio}{project.durationSeconds ? ` · ${project.durationSeconds}s` : ""}</span>{cost}</div> : null}
      </div>
      <div className={cn("shrink-0", !compact && "sm:hidden")}>{cost}</div>
    </Link>
  );
}
