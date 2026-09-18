import { escapeHtml, markdownToHtml } from "./markdown";

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
  const title = escapeHtml(SITE_META.title);
  const description = escapeHtml(SITE_META.description);
  const ogTitle = escapeHtml(SITE_META.ogTitle);
  const ogDescription = escapeHtml(SITE_META.ogDescription);
  const ogImageAlt = escapeHtml(SITE_META.ogImageAlt);
  const jsonLd = JSON.stringify({
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
  });
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${SITE_ORIGIN}/">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#cfcbc4">
<meta name="color-scheme" content="light">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;0,6..72,700;1,6..72,400&display=swap" rel="stylesheet">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Safer with Jev">
<meta property="og:locale" content="en_US">
<meta property="og:url" content="${SITE_ORIGIN}/">
<meta property="og:title" content="${ogTitle}">
<meta property="og:description" content="${ogDescription}">
<meta property="og:image" content="${OG_IMAGE}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${ogImageAlt}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${ogTitle}">
<meta name="twitter:description" content="${ogDescription}">
<meta name="twitter:image" content="${OG_IMAGE}">
<meta name="twitter:image:alt" content="${ogImageAlt}">
<script type="application/ld+json">${jsonLd}</script>
<style>
:root {
  color-scheme: light;
  --bg: #cfcbc4;
  --fg: #171614;
  --muted: #5e5b55;
  --accent: #1a5c3a;
  --code: #e4e0d8;
  --line: #9a958c;
}
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--fg); }
body {
  font-family: "Newsreader", "Iowan Old Style", Palatino, Georgia, serif;
  font-optical-sizing: auto;
  font-size: 1.125rem;
  line-height: 1.55;
  font-weight: 400;
}
main {
  max-width: 38rem;
  margin: 0 auto;
  padding: 3rem 1.2rem 5.5rem;
}
h1 {
  font-size: clamp(2.35rem, 7vw, 3.35rem);
  font-weight: 700;
  letter-spacing: -0.028em;
  line-height: 1.02;
  margin: 0 0 1.15rem;
  padding-bottom: 0.75rem;
  border-bottom: 2.5px solid var(--fg);
  text-wrap: balance;
}
h2 {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--fg);
  margin: 2.4rem 0 0.9rem;
  padding: 0.38rem 0;
  border-top: 1px solid var(--fg);
  border-bottom: 1px solid var(--fg);
}
h3 {
  font-family: "Newsreader", "Iowan Old Style", Palatino, Georgia, serif;
  font-size: 1.28rem;
  font-weight: 600;
  font-style: italic;
  letter-spacing: -0.015em;
  margin: 1.6rem 0 0.4rem;
}
p { margin: 0.72rem 0; }
main > p:first-of-type::first-letter {
  float: left;
  font-size: 3.55rem;
  font-weight: 700;
  line-height: 0.78;
  padding: 0.08em 0.1em 0 0;
}
a {
  color: inherit;
  text-decoration-color: color-mix(in srgb, var(--fg) 45%, transparent);
  text-underline-offset: 0.16em;
}
a:hover { color: var(--accent); }
code {
  font-family: "IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.82em;
  background: var(--code);
  padding: 0.08em 0.28em;
  border-radius: 0.12rem;
}
pre {
  overflow-x: auto;
  background: var(--code);
  border: 1px solid var(--line);
  border-radius: 0.12rem;
  padding: 0.95rem 1rem;
  margin: 1rem 0;
}
pre code { background: none; padding: 0; font-size: 0.78em; }
ul { padding-left: 1.2rem; }
main > ul:first-of-type {
  list-style: none;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 0.85rem 0 1.1rem;
}
main > ul:first-of-type a {
  display: inline-block;
  padding: 0.28rem 0.7rem 0.32rem;
  border: 1px solid var(--fg);
  border-radius: 0;
  text-decoration: none;
  font-size: 0.95rem;
}
main > ul:first-of-type a:hover {
  background: var(--fg);
  color: var(--bg);
}
main > p:last-child {
  margin-top: 2.8rem;
  padding-top: 0.85rem;
  border-top: 1px solid var(--fg);
  color: var(--muted);
  font-size: 0.95rem;
  font-style: italic;
}
::selection { background: color-mix(in srgb, var(--accent) 28%, var(--bg)); }
</style>
</head>
<body>
<main>
${markdownToHtml(markdown)}
</main>
</body>
</html>
`;
}

export function homepageResponse(markdown: string): Response {
  return new Response(renderHomepage(markdown), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=120",
    },
  });
}
