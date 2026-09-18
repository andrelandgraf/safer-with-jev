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

export function applyTimingHeaders(headers: Headers, elapsed: SaferTimings): void {
  headers.set("x-neon-jev-ms", String(roundMs(elapsed.jevMs)));
}
