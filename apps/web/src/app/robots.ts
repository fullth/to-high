import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site-content";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/auth/", "/chat/", "/sessions"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
