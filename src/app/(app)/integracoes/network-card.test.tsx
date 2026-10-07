import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("./actions", () => ({ disconnectAction: vi.fn() }));

import { NetworkLogo } from "@/components/app/network-logos";
import { NETWORKS } from "@/lib/social/networks";
import { NetworkCard } from "./network-card";

const card = (id: (typeof NETWORKS)[number]["id"], over: Partial<Parameters<typeof NetworkCard>[0]> = {}) => {
  const n = NETWORKS.find((x) => x.id === id)!;
  return renderToStaticMarkup(
    <NetworkCard network={{ id, label: n.label, backend: n.backend, audience: n.audience }} state={n.audience === "soon" ? "soon" : "active"} account={null} owner={false} ready {...over} />,
  );
};

describe("network logos and cards", () => {
  it("renders a logo for every network", () => {
    for (const n of NETWORKS) expect(renderToStaticMarkup(<NetworkLogo id={n.id} />)).toContain(`data-logo="${n.id}"`);
  });

  it("shows a connectable bundle network and the connected handle (account without tokens)", () => {
    expect(card("INSTAGRAM")).toContain("Conectar Instagram");
    const connected = card("INSTAGRAM", { account: { id: "a", handle: "felipe", status: "CONNECTED", scheduled: 0 } });
    expect(connected).toContain("Conectado como @felipe");
    expect(connected).toContain("Desvincular");
    expect(connected).not.toContain("Teste interno");
  });

  it("keeps Bluesky as Em breve", () => {
    expect(card("BLUESKY")).toContain("Em breve");
  });
});
