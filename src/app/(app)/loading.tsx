import { Skeleton } from "@/components/ui/skeleton";

export default function AppLoading() {
  return <div role="status" aria-label="Carregando seu laboratório" className="mx-auto max-w-content space-y-5 py-6"><span className="sr-only">Carregando seu laboratório…</span><Skeleton className="h-9 w-56" /><Skeleton className="h-4 w-64" /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[0, 1, 2].map((key) => <Skeleton className="h-52" key={key} />)}</div></div>;
}
