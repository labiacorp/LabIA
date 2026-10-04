import { PageHeading } from "@/components/app/page-heading";
import { googleConfigured } from "@/lib/auth-config";
import { requireUserId } from "@/lib/session";
export default async function ConnectionsPage() {
  await requireUserId();
  const mock =
    process.env.NODE_ENV !== "production" && process.env.FAL_MOCK === "1";
  const items = [
    {
      title: "Google",
      description: "Entrada com sua conta Google.",
      ready: googleConfigured(),
      state: "Configuração presente",
    },
    {
      title: "fal.ai",
      description: "Geração de fichas, imagens, clipes e montagem.",
      ready: mock || Boolean(process.env.FAL_KEY),
      state: mock
        ? "Modo de teste · sem geração real"
        : "Configuração presente",
    },
    {
      title: "Armazenamento de mídia",
      description: "Cópia durável dos arquivos e importação de referências.",
      ready: false,
      state: "Integração pendente",
    },
  ];
  return (
    <div className="mx-auto max-w-content">
      <PageHeading
        title="Conexões"
        description="Disponibilidade das integrações usadas pela LabIA. A configuração é gerenciada pela equipe durante a beta."
      />
      <div className="grid gap-4 md:grid-cols-3">
        {items.map((item) => (
          <section
            key={item.title}
            className="rounded-lab border border-lab-border bg-lab-surface-1 p-5"
          >
            <h2 className="font-display text-xl">{item.title}</h2>
            <p className="my-4 text-body-sm leading-6 text-lab-text-dim">
              {item.description}
            </p>
            <p
              className={`text-caption ${item.ready ? "text-lab-success" : "text-lab-warning"}`}
            >
              {item.ready
                ? item.state
                : item.title === "Armazenamento de mídia"
                  ? item.state
                  : "Configuração pendente"}
            </p>
          </section>
        ))}
      </div>
      <p className="mt-5 text-body-sm leading-6 text-lab-text-dim">
        Configuração presente não confirma uma conexão funcionando. O login
        Google e os provedores reais precisam de validação pela equipe antes do
        uso.
      </p>
    </div>
  );
}
