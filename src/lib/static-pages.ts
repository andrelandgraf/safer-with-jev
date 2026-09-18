import { SITE_ORIGIN } from "./homepage";
import { OG_PNG } from "./og-png";

const STATIC_CACHE = "public, max-age=86400";

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#0b0c0b"/>
  <circle cx="16" cy="16" r="6.5" fill="#7cffb2"/>
</svg>
`;

export function ogPngResponse(): Response {
  return new Response(OG_PNG, {
    headers: {
      "content-type": "image/png",
      "cache-control": STATIC_CACHE,
    },
  });
}

export function faviconResponse(): Response {
  return new Response(FAVICON_SVG, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": STATIC_CACHE,
    },
  });
}

export function robotsResponse(): Response {
  const body = `User-agent: *
Allow: /
Allow: /og.png
Allow: /favicon.svg
Allow: /sitemap.xml
Disallow: /ask-jev
Disallow: /nice-try
Disallow: /block-

Sitemap: ${SITE_ORIGIN}/sitemap.xml
`;
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": STATIC_CACHE,
    },
  });
}

export function sitemapResponse(): Response {
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${SITE_ORIGIN}/</loc>
  </url>
</urlset>
`;
  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": STATIC_CACHE,
    },
  });
}
