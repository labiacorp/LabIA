// The only plan: a monthly subscription that grants credits. A credit is provider budget: the ledger stays in
// reais of provider cost and the UI shows it as credits. Import-free so client components can format credits.
// ponytail: credits/price are placeholders until the founders fix the API share of the price (35% here).
export const PLAN_PRICE_BRL = 49.9;
export const PLAN_CREDITS = 350;
export const CREDIT_BRL = 0.05;
export const PLAN_GRANT_BRL = PLAN_CREDITS * CREDIT_BRL;

const fmt = (n: number) => n.toLocaleString("pt-BR");
// A cost rounds up (never promise less than it takes); a balance rounds down (never show more than there is).
export const costCredits = (brl: number) => Math.max(0, Math.ceil(brl / CREDIT_BRL - 1e-9));
export const balanceCredits = (brl: number) => Math.floor(brl / CREDIT_BRL + 1e-9);
export const creditsText = (n: number) => `${fmt(n)} ${n === 1 ? "crédito" : "créditos"}`;
export const planPriceText = () => PLAN_PRICE_BRL.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const costText = (brl: number) => creditsText(costCredits(brl));
export const balanceText = (brl: number) => creditsText(balanceCredits(brl));
// Per-unit rates (per second, per image) can be fractions of a credit.
export const rateText = (brl: number) => `${(brl / CREDIT_BRL).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} créditos`;
