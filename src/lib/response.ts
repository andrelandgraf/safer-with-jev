import { errorPayload, type HttpError } from "./http-error";
import { applyTimingHeaders, type SaferTimings } from "./timing";
import type { DestinationName } from "./routing";
import type { Judgment } from "./policy";
import { redactTarget } from "./ssrf";

export type Destination = {
  name: DestinationName;
  target: string;
  status: number | "not_attempted" | "unknown";
};

export const CORS_EXPOSE = [
  "x-neon-allow",
  "x-neon-action",
  "x-neon-nouls",
  "x-neon-severity",
  "x-neon-policy",
  "x-neon-basis",
  "x-neon-destination-name",
  "x-neon-destination-target",
  "x-neon-destination-status",
  "x-neon-vision-ms",
  "x-neon-jev-ms",
  "x-neon-proxy-ms",
  "x-neon-total-ms",
  "x-neon-request-id",
  "Server-Timing",
] as const;

export function applyJudgmentHeaders(
  headers: Headers,
  judgment: Judgment,
  destination: Destination | undefined,
  requestId: string,
): void {
  headers.set("x-neon-allow", String(judgment.allow));
  headers.set("x-neon-action", judgment.action);
  headers.set(
    "x-neon-nouls",
    Object.entries(judgment.nouls)
      .map(([name, value]) => `${name}=${value}`)
      .join(","),
  );
  headers.set("x-neon-severity", String(judgment.severity));
  headers.set("x-neon-policy", judgment.policy);
  headers.set("x-neon-basis", judgment.basis);
  headers.set("x-neon-request-id", requestId);
  if (destination) {
    headers.set("x-neon-destination-name", destination.name);
    headers.set("x-neon-destination-target", destination.target);
    headers.set("x-neon-destination-status", String(destination.status));
  }
}

export function judgmentJson(
  judgment: Judgment,
  destination: Destination | undefined,
): Record<string, unknown> {
  if (!destination) {
    return judgment;
  }
  return { ...judgment, destination };
}

export function jsonResponse(input: {
  status: number;
  body: unknown;
  judgment?: Judgment;
  destination?: Destination;
  timings: SaferTimings;
  requestId: string;
  retryAfter?: number;
}): Response {
  const headers = new Headers({
    "content-type": "application/json",
    "cache-control": "no-store",
  });
  if (input.judgment) {
    applyJudgmentHeaders(headers, input.judgment, input.destination, input.requestId);
  } else {
    headers.set("x-neon-request-id", input.requestId);
  }
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
  destination: Destination;
  timings: SaferTimings;
  requestId: string;
}): Response {
  const code = input.judgment.action === "block" ? "guardrail_blocked" : "guardrail_review_required";
  const message =
    input.judgment.action === "block"
      ? "Request blocked by Safer with Jev."
      : "Request requires review; forwarding is refused.";
  return jsonResponse({
    status: 403,
    body: {
      error: {
        message,
        type: "permission_error",
        code,
        param: null,
        stage: "jev",
      },
      ...judgmentJson(input.judgment, input.destination),
    },
    judgment: input.judgment,
    destination: input.destination,
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
