export const contentStatusLabels: Record<string, string> = { IDEA: "Ideia", IN_PROGRESS: "Em produção", REVIEW: "Em revisão", APPROVED: "Aprovado", REJECTED: "Rejeitado" };
export const currency = (value: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
export const dateLabel = (value: Date) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "medium", timeZone: "America/Sao_Paulo" }).format(value);
