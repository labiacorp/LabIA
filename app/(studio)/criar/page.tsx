import { CreateWorkspace } from "@/components/create/create-workspace";

export default async function CreatePage({ searchParams }: { searchParams: Promise<{ receita?: string }> }) {
  const { receita } = await searchParams;
  return <CreateWorkspace initialTemplate={receita} />;
}
