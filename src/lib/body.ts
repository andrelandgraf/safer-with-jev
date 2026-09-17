import { HttpError } from "./http-error";
import { INGEST_MS } from "./limits";

function ingestAbortError(timeout: AbortSignal, signal: AbortSignal): HttpError {
  if (timeout.aborted) {
    return new HttpError(408, "ingest_timeout", "Timed out reading the request body.", "ingest");
  }
  if (signal.aborted) {
    return new HttpError(504, "deadline", "Request deadline exceeded while reading the body.", "ingest");
  }
  return new HttpError(408, "ingest_timeout", "Timed out reading the request body.", "ingest");
}

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

  const onAbort = () => {
    void reader.cancel().catch(() => undefined);
  };
  combined.addEventListener("abort", onAbort, { once: true });

  try {
    while (true) {
      if (combined.aborted) {
        throw ingestAbortError(timeout, signal);
      }
      const pending = reader.read();
      const aborted = new Promise<never>((_, reject) => {
        if (combined.aborted) {
          reject(ingestAbortError(timeout, signal));
          return;
        }
        combined.addEventListener(
          "abort",
          () => {
            reject(ingestAbortError(timeout, signal));
          },
          { once: true },
        );
      });
      const { done, value } = await Promise.race([pending, aborted]);
      if (combined.aborted) {
        throw ingestAbortError(timeout, signal);
      }
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
    combined.removeEventListener("abort", onAbort);
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
