import { parseAskResult, parseInspectResult, type AskResult, type InspectResult } from "./interpret";

export type InspectCall =
  | { kind: "ask"; q: string; t: string }
  | { kind: "nice-try"; p: string }
  | { kind: "text"; path: "/block-prompt-injections" | "/block-unsafe-replies"; body: string };

export type InspectOk = {
  kind: "ok";
  result: AskResult | InspectResult;
  roundtripMs: number;
};

export type InspectFailure = {
  kind: "error";
  status: number | null;
  message: string;
  requestId: string | null;
  retryAfterSec: number | null;
  roundtripMs: number;
};

export type InspectAborted = { kind: "aborted" };

export type InspectOutcome = InspectOk | InspectFailure | InspectAborted;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function errorMessage(status: number | null, body: unknown): string {
  if (isRecord(body) && isRecord(body.error) && typeof body.error.message === "string") {
    return body.error.message;
  }
  if (status === 429) {
    return "This public demo is rate limited.";
  }
  if (status === null) {
    return "The result could not be read.";
  }
  return `The API returned HTTP ${status}.`;
}

function parseRetryAfter(header: string | null): number | null {
  if (!header) {
    return null;
  }
  const seconds = Number(header);
  if (Number.isInteger(seconds) && seconds >= 0) {
    return seconds;
  }
  return null;
}

export async function fetchInspect(
  origin: string,
  call: InspectCall,
  signal: AbortSignal,
): Promise<InspectOutcome> {
  const started = performance.now();
  let url: URL;
  const headers = new Headers();
  let method = "GET";
  let body: Blob | string | undefined;
  if (call.kind === "ask") {
    url = new URL("/ask-jev", origin);
    url.searchParams.set("q", call.q);
    url.searchParams.set("t", call.t);
  } else if (call.kind === "nice-try") {
    url = new URL("/nice-try", origin);
    url.searchParams.set("p", call.p);
  } else {
    url = new URL(call.path, origin);
    method = "POST";
    headers.set("content-type", "text/plain");
    body = call.body;
  }
  try {
    const response = await fetch(url, {
      method,
      headers,
      body,
      signal,
      credentials: "omit",
      cache: "no-store",
    });
    const roundtripMs = Math.round(performance.now() - started);
    const requestId = response.headers.get("x-neon-request-id");
    const retryAfterSec = parseRetryAfter(response.headers.get("retry-after"));
    let parsed: unknown;
    try {
      parsed = JSON.parse(await response.text());
    } catch {
      return {
        kind: "error",
        status: response.status,
        message: "The result could not be read.",
        requestId,
        retryAfterSec,
        roundtripMs,
      };
    }
    if (!response.ok) {
      return {
        kind: "error",
        status: response.status,
        message: errorMessage(response.status, parsed),
        requestId,
        retryAfterSec,
        roundtripMs,
      };
    }
    try {
      const result = call.kind === "ask" ? parseAskResult(parsed) : parseInspectResult(parsed);
      return { kind: "ok", result, roundtripMs };
    } catch (error) {
      return {
        kind: "error",
        status: response.status,
        message: error instanceof Error ? error.message : "The result could not be read.",
        requestId,
        retryAfterSec,
        roundtripMs,
      };
    }
  } catch {
    if (signal.aborted) {
      return { kind: "aborted" };
    }
    return {
      kind: "error",
      status: null,
      message: "The result could not be read.",
      requestId: null,
      retryAfterSec: null,
      roundtripMs: Math.round(performance.now() - started),
    };
  }
}
