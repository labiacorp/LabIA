import type { Prisma } from "@/generated/prisma/client";
import type { AssetKind, AssetRole } from "@/generated/prisma/enums";

export const LIBRARY_PAGE_SIZE = 24;
export type LibraryFilters = {
  influencer: string;
  kind: AssetKind | "all";
  role: AssetRole | "all" | "content";
  period: "all" | "7d" | "30d";
  q: string;
  page: number;
};
export const DEFAULT_LIBRARY_FILTERS: LibraryFilters = {
  influencer: "all",
  kind: "all",
  role: "all",
  period: "all",
  q: "",
  page: 1,
};
export type LibraryParams = Record<string, string | string[] | undefined>;

export function parseLibraryFilters(params: LibraryParams): LibraryFilters {
  const value = (key: string) =>
    typeof params[key] === "string" ? (params[key] as string) : "";
  const page = Number(value("page"));
  return {
    influencer: value("influencer").slice(0, 100) || "all",
    kind: ["IMAGE", "VIDEO", "AUDIO"].includes(value("kind"))
      ? (value("kind") as AssetKind)
      : "all",
    role: ["SHEET", "FRONT", "PROFILE", "DETAIL", "content"].includes(
      value("role"),
    )
      ? (value("role") as LibraryFilters["role"])
      : "all",
    period: ["7d", "30d"].includes(value("period"))
      ? (value("period") as LibraryFilters["period"])
      : "all",
    q: value("q").trim().slice(0, 120),
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
  };
}

export function libraryWhere(
  userId: string,
  filters: LibraryFilters,
  now = new Date(),
): Prisma.AssetWhereInput {
  return {
    userId,
    ...(filters.influencer !== "all"
      ? { influencerId: filters.influencer }
      : {}),
    ...(filters.kind !== "all" ? { kind: filters.kind } : {}),
    ...(filters.role === "content"
      ? { contentId: { not: null }, role: null }
      : filters.role !== "all"
        ? { role: filters.role }
        : {}),
    ...(filters.period !== "all"
      ? {
          createdAt: {
            gte: new Date(
              now.getTime() - (filters.period === "7d" ? 7 : 30) * 86400000,
            ),
          },
        }
      : {}),
    ...(filters.q
      ? {
          OR: [
            { fileName: { contains: filters.q, mode: "insensitive" } },
            {
              influencer: {
                name: { contains: filters.q, mode: "insensitive" },
              },
            },
            {
              content: { title: { contains: filters.q, mode: "insensitive" } },
            },
          ],
        }
      : {}),
  };
}

export function libraryHref(
  filters: LibraryFilters,
  changes: Partial<LibraryFilters> = {},
) {
  const next = { ...filters, ...changes };
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(next)) {
    if (value !== "all" && value !== "" && !(key === "page" && value === 1))
      params.set(key, String(value));
  }
  return params.size ? `/biblioteca?${params}` : "/biblioteca";
}
