import { isIP } from "node:net";

export function clientIp(headers: Headers): string {
  const direct = headers.get("x-real-ip") ?? headers.get("cf-connecting-ip") ?? headers.get("true-client-ip");
  if (direct) {
    const ip = direct.trim();
    if (isIP(ip)) {
      return ip;
    }
  }
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const hops = forwarded.split(",").map((part) => part.trim()).filter(Boolean);
    const last = hops[hops.length - 1];
    if (last && isIP(last)) {
      return last;
    }
  }
  return "unknown";
}
