import { errorPayload, type HttpError } from "./http-error";
import { applyTimingHeaders, roundMs, type SaferTimings } from "./timing";
import type { DestinationName } from "./routing";
import type { Judgment, JudgmentAction } from "./policy";
import { redactTarget } from "./ssrf";

export type Destination = {
  name: DestinationName;
  target: string;
  status: number | "not_attempted" | "unknown";
};

export type InspectBody = {
  allow: boolean;
  action: JudgmentAction;
  jevMs: number;
};

export type AskBody = {
  noul: number;
  jevMs: number;
};

export const CORS_EXPOSE = [
  "x-neon-allow",
  "x-neon-action",
  "x-neon-jev-ms",
  "x-neon-request-id",
] as const;

export function inspectBody(judgment: Judgment, jevMs: number): InspectBody {
  return {
    allow: judgment.allow,
    action: judgment.action,
    jevMs: roundMs(jevMs),
  };
}

export function askBody(noul: number, jevMs: number): AskBody {
  return {
    noul,
    jevMs: roundMs(jevMs),
  };
}

export function applyJudgmentHeaders(headers: Headers, judgment: Judgment, requestId: string): void {
  headers.set("x-neon-allow", String(judgment.allow));
  headers.set("x-neon-action", judgment.action);
  headers.set("x-neon-request-id", requestId);
}

export function jsonResponse(input: {
  status: number;
  body: unknown;
  timings: SaferTimings;
  requestId: string;
  retryAfter?: number;
}): Response {
  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  headers.set("x-neon-request-id", input.requestId);
  applyTimingHeaders(headers, input.timings);
  if (input.retryAfter !== undefined) {
    headers.set("Retry-After", String(input.retryAfter));
  }
  return new Response(JSON.stringify(input.body), { status: input.status, headers });
}

export function errorResponse(input: {
  error: HttpError;
  timings: SaferTimings;
  requestId: string;
  retryAfter?: number;
}): Response {
  return jsonResponse({
    status: input.error.status,
    body: errorPayload(input.error),
    timings: input.timings,
    requestId: input.requestId,
    retryAfter: input.retryAfter,
  });
}

export function denyResponse(input: {
  judgment: Judgment;
  timings: SaferTimings;
  requestId: string;
}): Response {
  return jsonResponse({
    status: 403,
    body: inspectBody(input.judgment, input.timings.jevMs),
    timings: input.timings,
    requestId: input.requestId,
  });
}

export function destinationFrom(
  name: DestinationName | undefined,
  href: string | undefined,
  status: Destination["status"],
): Destination | undefined {
  if (!name || !href) {
    return undefined;
  }
  return { name, target: redactTarget(href), status };
}
