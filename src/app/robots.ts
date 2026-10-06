import type { MetadataRoute } from "next";

// Public: the landing and the legal pages. Everything behind sign-in stays out of search.
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", allow: ["/", "/termos", "/privacidade"], disallow: ["/api/", "/painel", "/admin", "/conta", "/saldo", "/i/", "/r/"] } };
}
