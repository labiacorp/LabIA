"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { Share2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { CostChip } from "@/components/ui/cost-chip";
import { EmptyState } from "@/components/ui/empty-state";
import type { NetworkId } from "@/lib/social/networks";
import { cancelPostAction } from "./actions";
import { NetworkLogo } from "@/components/app/network-logos";

export type PostRow = {
  id: string;
  network: NetworkId;
  handle: string;
  text: string;
  status: "SCHEDULED" | "PUBLISHING" | "PUBLISHED" | "FAILED" | "CANCELED" | "UNKNOWN";
  scheduledAt: string;
  publishedAt: string | null;
  url: string | null;
  error: string | null;
  estimatedCost: number;
  actualCost: number | null;
  media: { kind: string; url: string } | null;
};

const STATUS = {
  SCHEDULED: ["review", "Agendado"],
  PUBLISHING: ["running", "Publicando"],
  PUBLISHED: ["ready", "Publicado"],
  FAILED: ["error", "Falhou"],
  CANCELED: ["archived", "Cancelado"],
  UNKNOWN: ["review", "Em verificação"],
} as const;

const when = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Sao_Paulo" }).format(new Date(iso));

function Cost({ post }: { post: PostRow }) {
  if (post.status === "PUBLISHED") {
    const value = post.actualCost ?? post.estimatedCost;
    return <CostChip state={value === 0 ? "free" : "actual"} value={value} size="sm" />;
  }
  // Failed and canceled posts were refunded, so the real cost is zero.
  if (post.status === "FAILED" || post.status === "CANCELED") return <CostChip state="actual" value={0} size="sm" />;
  if (post.estimatedCost === 0) return <CostChip state="free" value={0} size="sm" />;
  return <CostChip state="estimated" value={post.estimatedCost} size="sm" />;
}

function Row({ post }: { post: PostRow }) {
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const [variant, label] = STATUS[post.status];
  const date = post.status === "PUBLISHED" && post.publishedAt ? post.publishedAt : post.scheduledAt;
  return (
    <li
      data-status={post.status}
      className="grid gap-3 rounded-lab border border-lab-border bg-lab-surface-1 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start"
    >
      <div className="flex items-center gap-3">
        <NetworkLogo id={post.network} className="size-10" />
        {post.media ? (
          post.media.kind === "VIDEO" ? (
            <video src={post.media.url} muted preload="metadata" className="size-12 rounded-control border border-lab-border object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.media.url} alt="" className="size-12 rounded-control border border-lab-border object-cover" />
          )
        ) : null}
      </div>
      <div className="min-w-0">
        <p className="text-caption text-lab-text-dim">
          @{post.handle} · {when(date)}
        </p>
        <p className="mt-1 line-clamp-2 text-body-sm">{post.text}</p>
        {post.error ? <p className="mt-1 text-caption text-lab-danger">{post.error}</p> : null}
        {error ? (
          <p role="alert" className="mt-1 text-caption text-lab-danger">
            {error}
          </p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <Badge variant={variant} dot>
          {label}
        </Badge>
        <Cost post={post} />
        {post.status === "PUBLISHED" && post.url ? (
          <a href={post.url} target="_blank" rel="noopener noreferrer" className={buttonVariants({ variant: "secondary", size: "lg" })}>
            Ver post
          </a>
        ) : null}
        {post.status === "SCHEDULED" ? (
          <button
            type="button"
            disabled={pending}
            className={buttonVariants({ variant: "secondary", size: "lg" })}
            onClick={() =>
              start(async () => {
                const result = await cancelPostAction(post.id);
                setError("error" in result ? result.error : "");
              })
            }
          >
            {pending ? "Cancelando…" : "Cancelar"}
          </button>
        ) : null}
      </div>
    </li>
  );
}

export function PostList({ posts }: { posts: PostRow[] }) {
  if (!posts.length)
    return (
      <EmptyState
        icon={Share2}
        title="Nenhuma publicação ainda"
        description="Abra um arquivo na biblioteca e publique ou agende em uma das redes conectadas."
        action={
          <Link href="/biblioteca" className={buttonVariants({ variant: "secondary", size: "lg" })}>
            Ir para a biblioteca
          </Link>
        }
      />
    );
  return (
    <ul className="grid gap-3">
      {posts.map((post) => (
        <Row key={post.id} post={post} />
      ))}
    </ul>
  );
}
