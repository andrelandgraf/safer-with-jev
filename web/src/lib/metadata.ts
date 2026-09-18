import type { Metadata } from "next";
import { SITE_META, SITE_ORIGIN } from "./site";

export function siteMetadata(): Metadata {
  const image = `${SITE_ORIGIN}/og.png`;
  return {
    metadataBase: new URL(SITE_ORIGIN),
    title: SITE_META.title,
    description: SITE_META.description,
    applicationName: "Safer with Jev",
    openGraph: {
      type: "website",
      locale: "en_US",
      url: `${SITE_ORIGIN}/`,
      siteName: "Safer with Jev",
      title: SITE_META.ogTitle,
      description: SITE_META.ogDescription,
      images: [{ url: image, width: 1200, height: 630, alt: SITE_META.ogImageAlt }],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_META.ogTitle,
      description: SITE_META.ogDescription,
      images: [image],
    },
    icons: { icon: "/favicon.svg" },
  };
}
