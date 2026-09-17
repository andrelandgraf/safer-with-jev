import { timingSafeEqual } from "node:crypto";

export function bearerToken(request: Request): string | undefined {
  const header = request.headers.get("authorization");
  if (header) {
    const match = /^Bearer\s+(.+)$/i.exec(header.trim());
    if (match) {
      return match[1];
    }
  }
  const apiKey = request.headers.get("x-api-key");
  return apiKey ?? undefined;
}

export function tokensMatch(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}
