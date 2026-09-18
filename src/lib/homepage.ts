import { markdownToHtml } from "./markdown";
import { renderNewsprintPage } from "./newsprint";

export const SITE_ORIGIN = "https://safer-with-jev.com";

export const SITE_META = {
  title: "Safer with Jev",
  description: "Route through Jev, because you'd rather be safe than sorry.",
  ogTitle: "Safer with Jev",
  ogDescription: "Route through Jev, because you'd rather be safe than sorry.",
  ogImageAlt:
    'Gray newsprint card with "Safer with Jev" above large serif text reading "Route through Jev. Rather safe than sorry."',
} as const;

const OG_IMAGE = `${SITE_ORIGIN}/og.png`;

export function renderHomepage(markdown: string): string {
  return renderNewsprintPage({
    canonical: `${SITE_ORIGIN}/`,
    title: SITE_META.title,
    description: SITE_META.description,
    ogTitle: SITE_META.ogTitle,
    ogDescription: SITE_META.ogDescription,
    ogImage: OG_IMAGE,
    ogImageAlt: SITE_META.ogImageAlt,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: "Safer with Jev",
      url: `${SITE_ORIGIN}/`,
      description: SITE_META.description,
      applicationCategory: "DeveloperApplication",
      author: {
        "@type": "Person",
        name: "Andre Landgraf",
        url: "https://github.com/andrelandgraf",
      },
    },
    mainClass: "site",
    bodyHtml: markdownToHtml(markdown),
  });
}

export function homepageResponse(markdown: string): Response {
  return new Response(renderHomepage(markdown), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=120",
    },
  });
}
