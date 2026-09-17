import { HttpError } from "./http-error";

const HOP_BY_HOP = new Set([
  "connection",
  "keep-alive",
  "transfer-encoding",
  "te",
  "trailer",
  "upgrade",
  "proxy-authenticate",
  "proxy-authorization",
  "proxy-connection",
]);

const REQUEST_STRIP = new Set([
  ...HOP_BY_HOP,
  "host",
  "cookie",
  "cookie2",
  "content-length",
]);

const RESPONSE_STRIP = new Set([
  ...HOP_BY_HOP,
  "location",
  "set-cookie",
  "set-cookie2",
  "content-length",
  "server-timing",
  "cache-control",
]);

function nominatedByConnection(headers: Headers): Set<string> {
  const nominated = new Set<string>();
  const connection = headers.get("connection");
  if (!connection) {
    return nominated;
  }
  for (const token of connection.split(",")) {
    const name = token.trim().toLowerCase();
    if (name) {
      nominated.add(name);
    }
  }
  return nominated;
}

export function connectionWouldDropRequired(headers: Headers): boolean {
  const nominated = nominatedByConnection(headers);
  return nominated.has("authorization") || nominated.has("content-type");
}

export function outboundModelHeaders(headers: Headers, host: string, contentLength: number): Headers {
  const nominated = nominatedByConnection(headers);
  const outbound = new Headers();
  headers.forEach((value, name) => {
    const key = name.toLowerCase();
    if (REQUEST_STRIP.has(key) || nominated.has(key)) {
      return;
    }
    outbound.append(name, value);
  });
  outbound.set("Host", host);
  outbound.set("Content-Length", String(contentLength));
  return outbound;
}

export function outboundPutHeaders(contentType: string, host: string, contentLength: number): Headers {
  const outbound = new Headers();
  outbound.set("Host", host);
  outbound.set("Content-Type", contentType);
  outbound.set("Content-Length", String(contentLength));
  return outbound;
}

export function filterUpstreamResponseHeaders(headers: Headers): Headers {
  const nominated = nominatedByConnection(headers);
  const outbound = new Headers();
  headers.forEach((value, name) => {
    const key = name.toLowerCase();
    if (RESPONSE_STRIP.has(key) || nominated.has(key)) {
      return;
    }
    if (key.startsWith("x-neon-") || key.startsWith("access-control-")) {
      return;
    }
    outbound.append(name, value);
  });
  return outbound;
}

const PUT_SIGNED_HEADERS = new Set(["host", "content-type", "content-length"]);

export function assertPutSignedHeaders(search: string): void {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const raw = params.get("X-Amz-SignedHeaders");
  if (!raw) {
    return;
  }
  for (const header of raw.split(";")) {
    const name = header.trim().toLowerCase();
    if (name && !PUT_SIGNED_HEADERS.has(name)) {
      throw new HttpError(
        400,
        "invalid_destination",
        `PUT target signs header ${name}, which Safer cannot forward.`,
        "validation",
      );
    }
  }
}

export function headersToRecord(headers: Headers): Record<string, string> {
  const record: Record<string, string> = {};
  headers.forEach((value, name) => {
    record[name] = value;
  });
  return record;
}
