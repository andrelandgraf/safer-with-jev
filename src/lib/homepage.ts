import { escapeHtml, markdownToHtml } from "./markdown";

export const SITE_ORIGIN = "https://safer-with-jev.com";

export const SITE_META = {
  title: "Safer with Jev | Check before you forward",
  description:
    "An HTTP gate that checks prompts, images and replies with TypeSafe Jev and forwards only requests that pass.",
  ogTitle: "Safer with Jev | Check before you forward",
  ogDescription:
    "Check prompts, images and replies with TypeSafe Jev before forwarding them to your endpoint.",
  ogImageAlt: "Safer with Jev. Check before you forward.",
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
<meta name="theme-color" content="#0b0c0b">
<meta name="color-scheme" content="dark">
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
  color-scheme: dark;
  --bg: #0b0c0b;
  --fg: #eceee9;
  --muted: #9aa396;
  --accent: #7cffb2;
  --code: #141614;
  --line: #2a2e2a;
}
* { box-sizing: border-box; }
html, body { margin: 0; background: var(--bg); color: var(--fg); }
body {
  font-family: ui-sans-serif, system-ui, sans-serif;
  font-size: 1.02rem;
  line-height: 1.6;
  letter-spacing: -0.011em;
}
main {
  max-width: 40rem;
  margin: 0 auto;
  padding: 3.25rem 1.25rem 5rem;
}
h1 {
  font-size: clamp(2rem, 5vw, 2.6rem);
  letter-spacing: -0.045em;
  font-weight: 650;
  line-height: 1.1;
  margin: 0 0 0.85rem;
}
h2 {
  font-size: 0.84rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--accent);
  margin: 2.6rem 0 0.75rem;
}
h3 {
  font-size: 1.12rem;
  font-weight: 600;
  letter-spacing: -0.025em;
  margin: 1.75rem 0 0.45rem;
}
p { margin: 0.8rem 0; }
a {
  color: inherit;
  text-decoration-color: color-mix(in srgb, var(--accent) 70%, transparent);
  text-underline-offset: 0.18em;
}
a:hover { color: var(--accent); }
code {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.88em;
  background: var(--code);
  padding: 0.12em 0.35em;
  border-radius: 0.3rem;
}
pre {
  overflow-x: auto;
  background: var(--code);
  border: 1px solid var(--line);
  border-radius: 0.7rem;
  padding: 1rem 1.1rem;
  margin: 1rem 0;
}
pre code { background: none; padding: 0; font-size: 0.82em; }
ul { padding-left: 1.15rem; }
main > ul:first-of-type {
  list-style: none;
  padding: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 1rem 0 1.2rem;
}
main > ul:first-of-type a {
  display: inline-block;
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--line);
  border-radius: 999px;
  text-decoration: none;
  font-size: 0.92rem;
}
main > ul:first-of-type a:hover {
  border-color: var(--accent);
}
main > p:last-child {
  margin-top: 3.2rem;
  color: var(--muted);
  font-size: 0.92rem;
}
::selection { background: color-mix(in srgb, var(--accent) 35%, transparent); }
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
