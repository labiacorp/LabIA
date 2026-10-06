// The statement filter shared by the page and the CSV export. Import-free on purpose.
export const LEDGER_FILTERS = [
  { key: "", label: "Tudo", reasons: null },
  { key: "entradas", label: "Créditos do mês", reasons: ["TOPUP"] },
  { key: "gastos", label: "Gerações", reasons: ["SPEND"] },
  { key: "devolucoes", label: "Devoluções", reasons: ["REFUND"] },
  { key: "bonus", label: "Bônus", reasons: ["REFERRAL"] },
] as const;
export const ledgerFilter = (key?: string) => LEDGER_FILTERS.find((item) => item.key === (key ?? "")) ?? LEDGER_FILTERS[0];
