export type SaferTimings = {
  visionMs: number;
  jevMs: number;
  proxyMs: number;
  totalMs: number;
  includeVision: boolean;
};

export function roundMs(elapsed: number): number {
  return Math.max(0, Math.round(elapsed));
}

export function serverTimingValue(timings: {
  visionMs: number;
  jevMs: number;
  proxyMs: number;
  totalMs: number;
  includeVision: boolean;
}): string {
  const parts = [];
  if (timings.includeVision) {
    parts.push(`vision;dur=${timings.visionMs}`);
  }
  parts.push(
    `jev;dur=${timings.jevMs}`,
    `proxy;dur=${timings.proxyMs}`,
    `total;dur=${timings.totalMs}`,
  );
  return parts.join(", ");
}

export function applyTimingHeaders(headers: Headers, elapsed: SaferTimings): void {
  const timings = {
    visionMs: roundMs(elapsed.visionMs),
    jevMs: roundMs(elapsed.jevMs),
    proxyMs: roundMs(elapsed.proxyMs),
    totalMs: roundMs(elapsed.totalMs),
    includeVision: elapsed.includeVision,
  };
  if (timings.includeVision) {
    headers.set("x-neon-vision-ms", String(timings.visionMs));
  }
  headers.set("x-neon-jev-ms", String(timings.jevMs));
  headers.set("x-neon-proxy-ms", String(timings.proxyMs));
  headers.set("x-neon-total-ms", String(timings.totalMs));
  headers.set("Server-Timing", serverTimingValue(timings));
}
