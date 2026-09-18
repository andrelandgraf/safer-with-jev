import { SITE_ORIGIN } from "./homepage";
import { OG_PNG } from "./og-png";

const STATIC_CACHE = "public, max-age=86400";

const FAVICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <rect width="32" height="32" fill="#cfcbc4"/>
  <rect x="5" y="5" width="22" height="22" fill="none" stroke="#171614" stroke-width="1.25"/>
  <circle cx="16" cy="16" r="3.25" fill="#171614"/>
</svg>
`;

const PNG_HEADERS = {
  "content-type": "image/png",
  "cache-control": STATIC_CACHE,
} as const;

function pngBody(png: Buffer): Uint8Array<ArrayBuffer> {
  const body = new Uint8Array(png.byteLength);
  body.set(png);
  return body;
}

export function ogPngResponse(): Response {
  return new Response(pngBody(OG_PNG), {
    headers: PNG_HEADERS,
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
