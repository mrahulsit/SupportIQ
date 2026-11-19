import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // App internals and per-assistant pages aren't useful in search results.
      disallow: ["/dashboard", "/api/", "/embed/", "/test/"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
