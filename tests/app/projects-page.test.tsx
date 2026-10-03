import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

const mockListProjects = vi.hoisted(() => vi.fn());

vi.mock("@/lib/projects", () => ({ listProjects: mockListProjects }));
vi.mock("@/lib/flows/ownership", () => ({
  getOwnedExecutionScope: vi.fn().mockResolvedValue({ ownerId: "owner-a", workspaceId: "workspace-a" }),
}));

import ProjectsPage from "@/app/(studio)/projetos/page";

describe("Projects page", () => {
  it("opens the current project creation flow and existing projects", async () => {
    mockListProjects.mockResolvedValueOnce([{
      id: "project-a",
      name: "Campanha A",
      type: "VIDEO",
      objective: "Mostrar produto",
      aspectRatio: "9:16",
      status: "DRAFT",
      durationSeconds: 5,
      primaryFlow: { id: "flow-a", name: "Campanha A · Flow principal" },
    }]);

    const markup = renderToStaticMarkup(await ProjectsPage({ searchParams: Promise.resolve({}) }));

    expect(markup).toContain("Novo Projeto");
    expect(markup).toContain('href="/criar"');
    expect(markup).toContain("Campanha A");
    expect(markup).toContain('href="/projetos/project-a"');
    expect(markup).not.toContain('href="/fluxos/flow-a"');
  });
});
