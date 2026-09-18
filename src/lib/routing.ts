import { HttpError } from "./http-error";
import { TEXT_MAX_BYTES } from "./limits";
import { validateTargetUrl, type ValidatedTarget } from "./ssrf";

export type RouteName =
  | "block-prompt-injections"
  | "block-unsafe-images"
  | "block-unsafe-replies";

export type DestinationName = "chat-completions" | "responses" | "put";

export type Routing =
  | { kind: "inspect"; source: "body"; route: RouteName }
  | { kind: "inspect"; source: "query"; prompt: string }
  | {
      kind: "model";
      route: "block-prompt-injections";
      method: "POST";
      target: ValidatedTarget;
    }
  | {
      kind: "put";
      route: RouteName;
      method: "PUT";
      target: ValidatedTarget;
    };

function routeName(path: string): RouteName | null {
  if (path === "/block-prompt-injections") {
    return "block-prompt-injections";
  }
  if (path === "/block-unsafe-images") {
    return "block-unsafe-images";
  }
  if (path === "/block-unsafe-replies") {
    return "block-unsafe-replies";
  }
  return null;
}

export function parseRouting(request: Request): Routing {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (request.headers.has("x-safer-target") || request.headers.has("x-safer-upstream-authorization")) {
    throw new HttpError(
      400,
      "obsolete_routing",
      "Use ?target= for the upstream URL. X-Safer-Target and X-Safer-Upstream-Authorization are not accepted.",
      "validation",
    );
  }
  if (url.searchParams.has("destination") || url.searchParams.has("key")) {
    throw new HttpError(
      400,
      "obsolete_routing",
      "Use ?target= for the upstream URL. destination and key query parameters are not accepted.",
      "validation",
    );
  }

  const targets = url.searchParams.getAll("target");
  if (targets.length > 1) {
    throw new HttpError(400, "invalid_destination", "target must not be repeated.", "validation");
  }

  if (path === "/nice-try") {
    if (request.method !== "GET") {
      throw new HttpError(405, "method_not_allowed", "Use GET.", "validation");
    }
    if (targets.length > 0) {
      throw new HttpError(
        400,
        "inspect_only",
        "GET /nice-try is inspect-only. Do not send target.",
        "validation",
      );
    }
    assertNoBody(request);
    return { kind: "inspect", source: "query", prompt: queryPrompt(url) };
  }

  const route = routeName(path);
  if (!route) {
    throw new HttpError(404, "not_found", "Not found.", "validation");
  }

  if (request.method !== "POST" && request.method !== "PUT") {
    throw new HttpError(405, "method_not_allowed", "Use POST or PUT.", "validation");
  }

  if (targets.length === 0) {
    return { kind: "inspect", source: "body", route };
  }

  const raw = targets[0];
  if (raw === undefined || raw === "") {
    throw new HttpError(400, "invalid_destination", "target must not be empty.", "validation");
  }

  const target = validateTargetUrl(raw);

  if (request.method === "PUT") {
    if (request.headers.has("authorization")) {
      throw new HttpError(
        400,
        "invalid_destination",
        "PUT forwarding authenticates with the presigned URL. Do not send Authorization.",
        "validation",
      );
    }
    return { kind: "put", route, method: "PUT", target };
  }

  if (route !== "block-prompt-injections") {
    throw new HttpError(
      400,
      "invalid_destination",
      "Upload forwarding uses PUT. POST with target is only valid on /block-prompt-injections.",
      "validation",
    );
  }

  return { kind: "model", route: "block-prompt-injections", method: "POST", target };
}

export function destinationName(routing: Routing, protocol?: DestinationName): DestinationName | undefined {
  if (routing.kind === "put") {
    return "put";
  }
  if (routing.kind === "model") {
    return protocol;
  }
  return undefined;
}

export function isImageRoute(routing: Routing): boolean {
  if (routing.kind === "model") {
    return false;
  }
  if (routing.kind === "inspect" && routing.source === "query") {
    return false;
  }
  return routing.route === "block-unsafe-images";
}

export function isReplyRoute(routing: Routing): boolean {
  if (routing.kind === "model") {
    return false;
  }
  if (routing.kind === "inspect" && routing.source === "query") {
    return false;
  }
  return routing.route === "block-unsafe-replies";
}

function assertNoBody(request: Request): void {
  const length = request.headers.get("content-length");
  if (length !== null && length !== "0") {
    throw new HttpError(
      400,
      "unexpected_body",
      "GET /nice-try takes the prompt in ?p=. Do not send a body.",
      "validation",
    );
  }
}

function queryPrompt(url: URL): string {
  const values = url.searchParams.getAll("p");
  if (values.length === 0) {
    throw new HttpError(400, "missing_prompt", "Supply p exactly once.", "validation");
  }
  if (values.length > 1) {
    throw new HttpError(400, "invalid_prompt", "p must not be repeated.", "validation");
  }
  const raw = values[0];
  if (raw === undefined) {
    throw new HttpError(400, "missing_prompt", "Supply p exactly once.", "validation");
  }
  const text = raw.trim();
  if (!text) {
    throw new HttpError(400, "empty", "Prompt text is empty.", "validation");
  }
  if (new TextEncoder().encode(text).byteLength > TEXT_MAX_BYTES) {
    throw new HttpError(400, "payload_too_large", "Prompt exceeds the text size limit.", "validation");
  }
  return text;
}
