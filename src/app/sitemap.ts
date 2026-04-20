import type { MetadataRoute } from "next";
import { blogPosts } from "@/data/blog";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://hakata-sk-rookies-v2y8.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const parseDate = (d: string) => new Date(d.replace(/\./g, "-"));

  return [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.8 },
    ...blogPosts.map((p) => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: parseDate(p.date),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
