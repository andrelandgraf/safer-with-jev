import { request as httpsRequest } from "node:https";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { HttpError, type ErrorStage } from "./http-error";
import { headersToRecord } from "./headers";
import { DESTINATION_MAX_BYTES, STAGE_MS } from "./limits";
import { isBlockedAddress, type ValidatedTarget } from "./ssrf";

export type PinnedResponse = {
  status: number;
  headers: Headers;
  body: Uint8Array;
  headersArrived: boolean;
};

export async function resolvePublicAddresses(
  hostname: string,
  stage: ErrorStage,
  signal?: AbortSignal,
): Promise<string[]> {
  if (isIP(hostname)) {
    if (isBlockedAddress(hostname)) {
      throw new HttpError(400, "invalid_destination", "target address is not globally routable.", stage);
    }
    return [hostname];
  }

  let results: { address: string }[];
  try {
    const lookupPromise = lookup(hostname, { all: true, verbatim: true });
    if (!signal) {
      results = await lookupPromise;
    } else if (signal.aborted) {
      throw new HttpError(504, "deadline", "Request deadline exceeded during DNS.", stage);
    } else {
      results = await new Promise((resolve, reject) => {
        const onAbort = () => {
          reject(new HttpError(504, "deadline", "Request deadline exceeded during DNS.", stage));
        };
        signal.addEventListener("abort", onAbort, { once: true });
        lookupPromise.then(
          (value) => {
            signal.removeEventListener("abort", onAbort);
            resolve(value);
          },
          (error) => {
            signal.removeEventListener("abort", onAbort);
            reject(error);
          },
        );
      });
    }
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(
      stage === "destination" ? 502 : 400,
      "invalid_destination",
      "target hostname did not resolve.",
      stage,
    );
  }

  const addresses = results.map((row) => row.address);
  if (addresses.length === 0 || addresses.some((address) => isBlockedAddress(address))) {
    throw new HttpError(
      stage === "destination" ? 502 : 400,
      "invalid_destination",
      "target address is not globally routable.",
      stage,
    );
  }
  return addresses;
}

export async function pinnedFetch(input: {
  target: ValidatedTarget;
  method: string;
  headers: Headers;
  body: Uint8Array;
  signal: AbortSignal;
}): Promise<PinnedResponse> {
  const addresses = await resolvePublicAddresses(input.target.hostname, "destination", input.signal);
  const ip = addresses[0];
  if (!ip) {
    throw new HttpError(502, "invalid_destination", "target hostname did not resolve.", "destination");
  }
  const family = isIP(ip) === 6 ? 6 : 4;

  return await new Promise<PinnedResponse>((resolve, reject) => {
    let headersArrived = false;
    let settled = false;
    const chunks: Buffer[] = [];
    let total = 0;

    const fail = (error: unknown) => {
      if (settled) {
        return;
      }
      settled = true;
      if (error instanceof HttpError) {
        reject(error);
        return;
      }
      if (input.signal.aborted || (error instanceof Error && error.name === "AbortError")) {
        reject(
          new HttpError(
            504,
            "deadline",
            headersArrived
              ? "Destination timed out after headers arrived."
              : "Destination timed out.",
            "destination",
          ),
        );
        return;
      }
      reject(new HttpError(502, "destination_error", "Destination connection failed.", "destination"));
    };

    const req = httpsRequest(
      {
        method: input.method,
        hostname: ip,
        family,
        port: 443,
        path: input.target.requestPath,
        servername: input.target.hostname,
        headers: headersToRecord(input.headers),
        signal: input.signal,
        timeout: STAGE_MS,
      },
      (res) => {
        headersArrived = true;
        const headers = new Headers();
        for (const [name, value] of Object.entries(res.headers)) {
          if (value === undefined) {
            continue;
          }
          if (Array.isArray(value)) {
            for (const item of value) {
              headers.append(name, item);
            }
          } else {
            headers.set(name, value);
          }
        }
        res.on("data", (chunk: Buffer) => {
          total += chunk.byteLength;
          if (total > DESTINATION_MAX_BYTES) {
            res.destroy();
            fail(
              new HttpError(
                502,
                "destination_too_large",
                "Destination response exceeded the size limit.",
                "destination",
              ),
            );
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => {
          if (settled) {
            return;
          }
          settled = true;
          resolve({
            status: res.statusCode ?? 0,
            headers,
            body: new Uint8Array(Buffer.concat(chunks)),
            headersArrived,
          });
        });
        res.on("error", fail);
      },
    );

    req.on("timeout", () => {
      req.destroy();
    });
    req.on("error", fail);
    req.write(input.body);
    req.end();
  });
}
