export type ProxyTimings = {
  classifyMs: number;
  gatewayMs: number;
  totalMs: number;
};

export function roundMs(elapsed: number): number {
  return Math.max(0, Math.round(elapsed));
}

export function serverTimingValue(timings: {
  classifyMs: number;
  gatewayMs: number;
  totalMs: number;
}): string {
  return `classify;dur=${timings.classifyMs}, gateway;dur=${timings.gatewayMs}, total;dur=${timings.totalMs}`;
}

export function applyTimingHeaders(headers: Headers, elapsed: ProxyTimings): void {
  const timings = {
    classifyMs: roundMs(elapsed.classifyMs),
    gatewayMs: roundMs(elapsed.gatewayMs),
    totalMs: roundMs(elapsed.totalMs),
  };
  headers.set("x-neon-classify-ms", String(timings.classifyMs));
  headers.set("x-neon-gateway-ms", String(timings.gatewayMs));
  headers.set("x-neon-total-ms", String(timings.totalMs));
  headers.set("Server-Timing", serverTimingValue(timings));
}
