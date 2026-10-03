"use client";
import { ErrorState } from "@/components/ui/error-state";
export default function Error({reset}: {error: Error & {digest?:string};reset:()=>void}) { return <main className="mx-auto w-full max-w-[1216px] px-5 py-10 lg:px-8"><ErrorState title="Não foi possível carregar seus fluxos" onRetry={reset} /></main>; }
