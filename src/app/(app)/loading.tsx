import { Skeleton } from "@/components/ui/skeleton";

// Design loading state: title and subtitle bars, a grid of media cards with a title line and a chip each.
export default function AppLoading() {
  return <div role="status" aria-busy="true" className="mx-auto flex max-w-content flex-col gap-5">
    <Skeleton className="h-11 w-2/5" />
    <Skeleton className="h-4 w-[65%]" />
    <div className="mt-2 grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
      {[0, 1, 2, 3, 4, 5].map((key) => <div key={key} className="flex flex-col gap-2.5"><Skeleton className="aspect-[4/5] rounded-control" /><span className="h-3.5 w-[70%] rounded bg-lab-surface-2" /><span className="h-[26px] w-[84px] rounded-full bg-lab-surface-2" /></div>)}
    </div>
    <span className="text-[13px] text-lab-text-dim">Carregando…</span>
  </div>;
}
