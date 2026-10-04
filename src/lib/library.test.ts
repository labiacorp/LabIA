import { describe, expect, it } from "vitest";
import {
  parseLibraryFilters,
  libraryWhere,
  libraryHref,
  DEFAULT_LIBRARY_FILTERS,
} from "./library";
import { downloadSource, downloadFilename } from "./media-download";

describe("library scoping and filters", () => {
  it("keeps ownership independent of the supplied character and query", () => {
    const filters = parseLibraryFilters({
      influencer: "other-character",
      q: "  test  ",
      kind: "VIDEO",
      role: "content",
      period: "7d",
    });
    const where = libraryWhere(
      "owner",
      filters,
      new Date("2026-10-03T12:00:00Z"),
    );
    expect(where.userId).toBe("owner");
    expect(where.influencerId).toBe("other-character");
    expect(where.createdAt).toEqual({ gte: new Date("2026-09-26T12:00:00Z") });
    expect(where.contentId).toEqual({ not: null });
  });
  it("normalizes malformed filters and preserves safe pagination", () => {
    expect(
      parseLibraryFilters({
        kind: "bad",
        role: "bad",
        page: "1.5",
        period: "bad",
        q: ["bad"],
      }),
    ).toEqual(DEFAULT_LIBRARY_FILTERS);
    expect(parseLibraryFilters({ page: "999999" }).page).toBe(999999);
    const filters = parseLibraryFilters({ q: "a&b", kind: "VIDEO", page: "2" });
    expect(libraryHref(filters, { page: 3 })).toBe(
      "/biblioteca?kind=VIDEO&q=a%26b&page=3",
    );
  });
});
describe("asset download sources", () => {
  it("rejects arbitrary hosts, local addresses, credentials, ports and traversal", () => {
    for (const url of [
      "https://localhost/private",
      "http://fal.media/a",
      "https://fal.media.evil.com/a",
      "https://user:pass@fal.media/a",
      "https://fal.media:444/a",
      "https://127.0.0.1/a",
      "file:///etc/passwd",
      "/mock/../secret",
      "/mock/other.svg",
    ])
      expect(downloadSource(url, true)).toBeNull();
    expect(downloadSource("https://v3.fal.media/files/a.mp4")).not.toBeNull();
    expect(
      downloadSource("https://test.public.blob.vercel-storage.com/a.png"),
    ).not.toBeNull();
    expect(downloadSource("/mock/clip.mp4")).toBeNull();
    expect(downloadSource("/mock/clip.mp4", true)).toEqual({
      mockFile: "clip.mp4",
    });
  });
  it("builds safe attachment names and rejects unexpected file types", () => {
    const name = downloadFilename(
      'Vídeo "\r\nInjected: header',
      "abc12345678",
      "video/mp4",
    );
    expect(name).toBe("video-injected-header-12345678.mp4");
    expect(downloadFilename("test", "id", "text/html")).toBeNull();
  });
});
