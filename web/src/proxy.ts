import { NextResponse, type NextRequest } from "next/server";
import { readAgentsMarkdown } from "@/lib/agents-file";
import { negotiateAccept } from "@/lib/accept";

export const config = {
  matcher: [
    "/",
    "/ask-jev",
    "/nice-try",
    "/block-prompt-injections",
    "/block-unsafe-replies",
  ],
};

function documentation(kind: "markdown" | "plain", request: NextRequest): Response {
  const body = request.method === "HEAD" ? null : readAgentsMarkdown().toString("utf8");
  return new Response(body, {
    headers: {
      "content-type": kind === "markdown" ? "text/markdown; charset=utf-8" : "text/plain; charset=utf-8",
      "cache-control": "public, max-age=120",
      vary: "Accept",
    },
  });
}

export function proxy(request: NextRequest) {
  const method = request.method;
  const path = request.nextUrl.pathname;
  if (
    (method === "POST" || method === "PUT") &&
    path !== "/" &&
    path !== "/SITE.md" &&
    path !== "/AGENTS.md"
  ) {
    return NextResponse.json(
      {
        error: {
          message: "Inspect and forwarding requests go to https://api.safer-with-jev.com",
          type: "invalid_request_error",
          code: "use_api_host",
          param: null,
          stage: "admission",
        },
      },
      {
        status: 405,
        headers: {
          allow: "GET",
          "cache-control": "no-store",
        },
      },
    );
  }
  if (path !== "/" || (method !== "GET" && method !== "HEAD")) {
    return NextResponse.next();
  }
  const decision = negotiateAccept(request.headers.get("accept"));
  if (decision.kind === "markdown" || decision.kind === "plain") {
    return documentation(decision.kind, request);
  }
  if (decision.kind === "not_acceptable") {
    return new NextResponse(null, {
      status: 406,
      headers: { vary: "Accept" },
    });
  }
  const response = NextResponse.next();
  response.headers.append("vary", "Accept");
  return response;
}
