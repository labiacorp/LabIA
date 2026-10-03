const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const formatBrlValue = (value: number) => brl.format(value).replace(/\s/g, " ");
