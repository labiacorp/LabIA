import Image from "next/image";
import Link from "next/link";
import { Film } from "lucide-react";
import type { ContentStatus } from "@/generated/prisma/client";
import { contentStatusLabels, dateLabel } from "@/lib/platform";

export function ProductionCard({ id, influencerId, title, influencerName, status, updatedAt, preview, archived = false }: { id: string; influencerId: string; title: string; influencerName: string; status: ContentStatus; updatedAt: Date; preview?: string; archived?: boolean }) {
  return <Link href={`/i/${influencerId}/c/${id}`} className="home-production-card">
    <div className="home-production-preview">{preview ? <Image src={preview} alt={`Prévia de ${title}`} width={400} height={250} unoptimized /> : <Film className="size-8" aria-hidden />}<span>{archived ? "Arquivado" : contentStatusLabels[status]}</span></div>
    <div className="home-production-info"><p>{influencerName}</p><h3>{title}</h3><small>Atualizado em {dateLabel(updatedAt)}</small></div>
  </Link>;
}
