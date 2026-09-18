import { SITE_ORIGIN } from "./homepage";
import { OG_PNG, SHARE_OG_PNG } from "./og-png";
import { isShareSlug, SHARE_SLUGS } from "./share-pages";

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

export function shareOgPngResponse(file: string): Response | null {
  if (!file.endsWith(".png")) {
    return null;
  }
  const slug = file.slice(0, -".png".length);
  if (!isShareSlug(slug)) {
    return null;
  }
  return new Response(pngBody(SHARE_OG_PNG[slug]), {
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
  const allows = [
    "/",
    "/og.png",
    "/og/",
    "/favicon.svg",
    "/sitemap.xml",
    ...SHARE_SLUGS.map((slug) => `/${slug}`),
  ];
  const body = `User-agent: *
${allows.map((path) => `Allow: ${path}`).join("\n")}

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
  const locs = ["/", ...SHARE_SLUGS.map((slug) => `/${slug}`)];
  const urls = locs
    .map(
      (path) => `  <url>
    <loc>${SITE_ORIGIN}${path === "/" ? "/" : path}</loc>
  </url>`,
    )
    .join("\n");
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`;
  return new Response(body, {
    headers: {
      "content-type": "application/xml; charset=utf-8",
      "cache-control": STATIC_CACHE,
    },
  });
}
