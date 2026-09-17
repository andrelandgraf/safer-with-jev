import { HttpError } from "./http-error";
import { INGEST_MS } from "./limits";

export async function readBoundedBody(
  request: Request,
  maxBytes: number,
  signal: AbortSignal,
): Promise<Uint8Array> {
  if (!request.body) {
    return new Uint8Array();
  }
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  const timeout = AbortSignal.timeout(INGEST_MS);
  const combined = AbortSignal.any([signal, timeout]);

  try {
    while (true) {
      if (combined.aborted) {
        if (timeout.aborted) {
          throw new HttpError(408, "ingest_timeout", "Timed out reading the request body.", "ingest");
        }
        throw new HttpError(504, "deadline", "Request deadline exceeded while reading the body.", "ingest");
      }
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      if (!value) {
        continue;
      }
      total += value.byteLength;
      if (total > maxBytes) {
        throw new HttpError(413, "payload_too_large", "Request body exceeds the size limit.", "ingest");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export function utf8(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}
