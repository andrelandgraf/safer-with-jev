import { readAgentsMarkdown } from "@/lib/agents-file";

export const dynamic = "force-dynamic";

function markdownResponse(): Response {
  return new Response(readAgentsMarkdown().toString("utf8"), {
    headers: {
      "content-type": "text/markdown; charset=utf-8",
      "cache-control": "public, max-age=120",
      vary: "Accept",
    },
  });
}

export function GET() {
  return markdownResponse();
}
