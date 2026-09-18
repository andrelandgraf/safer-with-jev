import { readFileSync } from "node:fs";
import { join } from "node:path";

export const dynamic = "force-dynamic";

function siteMarkdown(): Buffer {
  const here = join(process.cwd(), "content/SITE.md");
  try {
    return readFileSync(here);
  } catch {
    return readFileSync(join(process.cwd(), "../SITE.md"));
  }
}

export function GET() {
  return new Response(siteMarkdown().toString("utf8"), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=120",
      vary: "Accept",
    },
  });
}
