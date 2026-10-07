import { expect, it } from "vitest";

import { plan } from "../../scripts/ledger-round";

// Amounts in ten-thousandths of a real, like the script.
const row = (id: string, delta: number, stepId: string | null = null) => ({ id, userId: "u", stepId, socialPostId: null, delta, createdAt: new Date(0) });

it("puts legacy rows on the credit grid the way whole-credit charging would have", () => {
  const changes = plan([
    row("topup", 100100), // R$10.01 top-up: a credit rounds down to R$10.00
    row("fail-spend", -4320, "failed"), row("fail-refund", 4320, "failed"), // −9 / +8 on screen: now −9 / +9, nets zero
    row("done-spend", -6480, "done"), row("done-adjust", 456, "done"), // net R$0.6024: charged 13 credits, the zero adjustment goes
    row("grid", -4500, "clean"), // already whole credits: untouched
  ]);
  expect(changes).toEqual([
    { id: "topup", userId: "u", from: 100100, to: 100000 },
    { id: "fail-spend", userId: "u", from: -4320, to: -4500 },
    { id: "fail-refund", userId: "u", from: 4320, to: 4500 },
    { id: "done-spend", userId: "u", from: -6480, to: -6500 },
    { id: "done-adjust", userId: "u", from: 456, to: 0 },
  ]);
});
