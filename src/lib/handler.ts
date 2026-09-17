import { TypeSafeClient } from "@typesafe-ai/sdk";
import { readBoundedBody } from "./body";
import { clientIp } from "./client-ip";
import {
  assertPutSignedHeaders,
  connectionWouldDropRequired,
  filterUpstreamResponseHeaders,
  outboundModelHeaders,
  outboundPutHeaders,
} from "./headers";
import { HttpError } from "./http-error";
import { inspectImage } from "./image";
import { judge } from "./judge";
import { IMAGE_MAX_BYTES, TEXT_MAX_BYTES, TOTAL_MS } from "./limits";
import type { Limiter } from "./limiter";
import { retryAfterSeconds } from "./limiter";
import { parseInspectPrompt, parseModelRequest, requireBearer } from "./model-request";
import { pinnedFetch, resolvePublicAddresses } from "./pinned-fetch";
import { destinationName, parseRouting } from "./routing";
import { parseReplyBody } from "./replies";
import {
  applyJudgmentHeaders,
  denyResponse,
  destinationFrom,
  errorResponse,
  jsonResponse,
  judgmentJson,
  type Destination,
} from "./response";
import { applyTimingHeaders } from "./timing";
import { captionImage } from "./vision";

export type SaferDeps = {
  typesafe: TypeSafeClient;
  limiter: Limiter;
  gatewayBaseUrl: string;
  gatewayToken: string;
};

function mediaType(headers: Headers): string {
  return headers.get("content-type")?.split(";")[0]?.trim().toLowerCase() ?? "";
}

function elapsedSince(started: number): number {
  return Date.now() - started;
}

function remainingMs(started: number): number {
  return Math.max(1, TOTAL_MS - elapsedSince(started));
}

function logEvent(entry: Record<string, unknown>): void {
  console.log(JSON.stringify(entry));
}

export async function handleSaferRequest(request: Request, deps: SaferDeps): Promise<Response> {
  const started = Date.now();
  const requestId = crypto.randomUUID();
  const total = AbortSignal.timeout(TOTAL_MS);
  let visionMs = 0;
  let jevMs = 0;
  let proxyMs = 0;
  let includeVision = false;
  let destination: Destination | undefined;
  let dispatched = false;

  const timings = () => ({
    visionMs,
    jevMs,
    proxyMs,
    totalMs: elapsedSince(started),
    includeVision,
  });

  try {
    const routing = parseRouting(request);
    includeVision = routing.route === "block-unsafe-images";

    if (routing.kind === "model") {
      if (connectionWouldDropRequired(request.headers)) {
        throw new HttpError(
          400,
          "invalid_destination",
          "Connection nominated a header required for model forwarding.",
          "validation",
        );
      }
      requireBearer(request.headers);
    }
    if (routing.kind === "put") {
      assertPutSignedHeaders(routing.target.search);
    }
    if (routing.kind !== "inspect") {
      await resolvePublicAddresses(routing.target.hostname, "validation", total);
    }

    await deps.limiter.admit({
      ip: clientIp(request.headers),
      image: routing.route === "block-unsafe-images",
      signal: total,
    });

    const maxBytes = routing.route === "block-unsafe-images" ? IMAGE_MAX_BYTES : TEXT_MAX_BYTES;
    const body = await readBoundedBody(request, maxBytes, total);
    const type = mediaType(request.headers);
    const rawContentType = request.headers.get("content-type")?.trim() || type;

    let state: unknown;
    let protocol: "chat-completions" | "responses" | "put" | undefined = destinationName(routing);
    if (routing.route === "block-unsafe-images") {
      if (!type.startsWith("image/")) {
        throw new HttpError(415, "unsupported_media_type", "Send a static JPEG, PNG, or WebP image.", "validation");
      }
      const image = inspectImage(body, type);
      includeVision = true;
      const visionStarted = Date.now();
      try {
        state = await captionImage({
          bytes: body,
          mime: image.mime,
          baseUrl: deps.gatewayBaseUrl,
          token: deps.gatewayToken,
          signal: total,
        });
      } finally {
        visionMs = Date.now() - visionStarted;
      }
    } else if (routing.route === "block-unsafe-replies") {
      state = parseReplyBody(body, type);
    } else if (routing.kind === "model") {
      const parsed = parseModelRequest(body);
      protocol = parsed.protocol;
      state = parsed.state;
    } else {
      state = parseInspectPrompt(body, type);
      if (routing.kind === "put") {
        protocol = "put";
      }
    }

    const judgeKind =
      routing.route === "block-unsafe-images"
        ? "image"
        : routing.route === "block-unsafe-replies"
          ? "reply"
          : "prompt";
    const jevStarted = Date.now();
    let judgment;
    try {
      judgment = await judge({
        client: deps.typesafe,
        state,
        kind: judgeKind,
        signal: total,
      });
    } finally {
      jevMs = Date.now() - jevStarted;
    }

    const destName = routing.kind === "put" ? "put" : protocol;
    if (routing.kind !== "inspect") {
      destination = destinationFrom(destName, routing.target.href, "not_attempted");
    }

    logEvent({
      requestId,
      stage: "jev",
      action: judgment.action,
      dispatch: routing.kind !== "inspect",
      timings: timings(),
    });

    if (routing.kind === "inspect") {
      return jsonResponse({
        status: 200,
        body: judgmentJson(judgment, undefined),
        judgment,
        timings: timings(),
        requestId,
      });
    }

    if (!judgment.allow || !destination) {
      return denyResponse({
        judgment,
        destination: destination ?? { name: destName ?? "put", target: "unknown", status: "not_attempted" },
        timings: timings(),
        requestId,
      });
    }

    const proxyStarted = Date.now();
    dispatched = true;
    const outboundHeaders =
      routing.kind === "put"
        ? outboundPutHeaders(
            rawContentType || "application/octet-stream",
            routing.target.hostHeader,
            body.byteLength,
          )
        : outboundModelHeaders(request.headers, routing.target.hostHeader, body.byteLength);
    const upstream = await pinnedFetch({
      target: routing.target,
      method: routing.kind === "put" ? "PUT" : "POST",
      headers: outboundHeaders,
      body,
      signal: AbortSignal.any([total, AbortSignal.timeout(remainingMs(started))]),
    });
    proxyMs = Date.now() - proxyStarted;
    destination = { ...destination, status: upstream.status };

    logEvent({
      requestId,
      stage: "destination",
      action: judgment.action,
      dispatch: true,
      status: upstream.status,
      timings: timings(),
    });

    if (routing.kind === "put") {
      if (upstream.status < 200 || upstream.status >= 300) {
        return jsonResponse({
          status: 502,
          body: {
            error: {
              message: "PUT destination returned an unsuccessful status.",
              type: "api_error",
              code: "destination_error",
              param: null,
              stage: "destination",
            },
            ...judgmentJson(judgment, destination),
          },
          judgment,
          destination,
          timings: timings(),
          requestId,
        });
      }
      return jsonResponse({
        status: 200,
        body: judgmentJson(judgment, destination),
        judgment,
        destination,
        timings: timings(),
        requestId,
      });
    }

    const headers = filterUpstreamResponseHeaders(upstream.headers);
    headers.set("cache-control", "no-store");
    applyJudgmentHeaders(headers, judgment, destination, requestId);
    applyTimingHeaders(headers, timings());
    return new Response(Buffer.from(upstream.body), { status: upstream.status, headers });
  } catch (error) {
    const http =
      error instanceof HttpError
        ? error
        : new HttpError(502, "internal", "Request failed.", dispatched ? "destination" : "validation");
    if (dispatched && destination) {
      destination = {
        ...destination,
        status: http.status === 504 ? "unknown" : destination.status,
      };
    }
    logEvent({
      requestId,
      stage: http.stage,
      action: null,
      dispatch: dispatched,
      status: http.status,
      timings: timings(),
    });
    if (dispatched && destination && (http.status === 502 || http.status === 504)) {
      return jsonResponse({
        status: http.status,
        body: {
          error: {
            message: http.message,
            type: http.status === 504 ? "timeout" : "api_error",
            code: http.code,
            param: null,
            stage: http.stage,
          },
          destination,
        },
        destination,
        timings: timings(),
        requestId,
      });
    }
    return errorResponse({
      error: http,
      timings: timings(),
      requestId,
      retryAfter: retryAfterSeconds(http),
    });
  }
}
