import { escapeHtml } from "./markdown";

export type NewsprintPage = {
  canonical: string;
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImage: string;
  ogImageAlt: string;
  jsonLd: unknown;
  mainClass: "site" | "share";
  bodyHtml: string;
};

export function renderNewsprintPage(page: NewsprintPage): string {
  const title = escapeHtml(page.title);
  const description = escapeHtml(page.description);
  const ogTitle = escapeHtml(page.ogTitle);
  const ogDescription = escapeHtml(page.ogDescription);
  const ogImage = escapeHtml(page.ogImage);
  const ogImageAlt = escapeHtml(page.ogImageAlt);
  const jsonLd = JSON.stringify(page.jsonLd);
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${escapeHtml(page.canonical)}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta name="theme-color" content="#cfcbc4">
<meta name="color-scheme" content="light">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;0,6..72,700;1,6..72,400&display=swap" rel="stylesheet">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Safer with Jev">
<meta property="og:locale" content="en_US">
<meta property="og:url" content="${escapeHtml(page.canonical)}">
<meta property="og:title" content="${ogTitle}">
<meta property="og:description" content="${ogDescription}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${ogImageAlt}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${ogTitle}">
<meta name="twitter:description" content="${ogDescription}">
<meta name="twitter:image" content="${ogImage}">
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
html, body {
  margin: 0;
  background-color: var(--bg);
  background-image: radial-gradient(rgba(23, 22, 20, 0.045) 0.6px, transparent 0.6px);
  background-size: 3px 3px;
  color: var(--fg);
}
body {
  font-family: "Newsreader", "Iowan Old Style", Palatino, Georgia, serif;
  font-optical-sizing: auto;
  font-size: 1.125rem;
  line-height: 1.55;
  font-weight: 400;
}
main {
  max-width: 42rem;
  margin: 0 auto;
  padding: 2.4rem 1.25rem 5.5rem;
}
.folio {
  margin: 0 0 0.55rem;
  text-align: center;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--muted);
}
h1 {
  font-size: clamp(2.5rem, 8vw, 3.6rem);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 0.98;
  margin: 0 0 1.35rem;
  padding: 0.55rem 0 0.7rem;
  border-top: 3px solid var(--fg);
  border-bottom: 3px double var(--fg);
  text-align: center;
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
main.site > h1 + p {
  font-size: 1.2rem;
  line-height: 1.45;
}
main.share h2:first-child { margin-top: 0; }
main.share h1 {
  text-align: left;
  border-top: none;
  border-bottom: 2.5px solid var(--fg);
  padding: 0 0 0.75rem;
  font-size: clamp(2.35rem, 7vw, 3.35rem);
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
ul {
  list-style: none;
  margin: 0.7rem 0 1.25rem;
  padding: 0;
}
li {
  position: relative;
  margin: 0;
  padding: 0.38rem 0 0.38rem 1.15rem;
  line-height: 1.4;
}
li + li {
  border-top: 1px solid color-mix(in srgb, var(--fg) 18%, transparent);
}
li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.72em;
  width: 0.38em;
  height: 0.38em;
  background: var(--fg);
}
main.site h2:has(+ ul) { margin-bottom: 0; }
main.site h2 + ul {
  margin-top: 0;
  padding: 0.15rem 0 0.2rem;
  border-bottom: 1px solid var(--fg);
}
@media (min-width: 40rem) {
  main.site h2 + ul {
    columns: 2;
    column-gap: 1.75rem;
    column-rule: 1px solid color-mix(in srgb, var(--fg) 22%, transparent);
  }
  main.site h2 + ul li + li { border-top: none; }
  main.site h2 + ul li { break-inside: avoid; }
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
<main class="${page.mainClass}">
${page.mainClass === "site" ? `<p class="folio">Vol. 1 · No. 1 · Mountain View, Calif.</p>\n` : ""}${page.bodyHtml}
</main>
</body>
</html>
`;
}
