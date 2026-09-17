import { markdownToHtml } from "./markdown";

export function renderHomepage(markdown: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Safer with Jev</title>
<style>
:root { color-scheme: light dark; }
body {
  font-family: ui-sans-serif, system-ui, sans-serif;
  max-width: 40rem;
  margin: 4rem auto;
  padding: 0 1.5rem 4rem;
  line-height: 1.55;
}
pre {
  overflow-x: auto;
  padding: 1rem;
  border: 1px solid color-mix(in srgb, CanvasText 14%, transparent);
}
code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9em; }
pre code { font-size: 0.85em; }
h1 { font-size: 1.75rem; }
h2 { font-size: 1.2rem; margin-top: 2rem; }
a { color: inherit; }
</style>
</head>
<body>
${markdownToHtml(markdown)}
</body>
</html>
`;
}

export function homepageResponse(markdown: string): Response {
  return new Response(renderHomepage(markdown), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "no-store",
    },
  });
}
