import { isIP } from "node:net";
import { HttpError } from "./http-error";

export type ValidatedTarget = {
  href: string;
  hostname: string;
  hostHeader: string;
  requestPath: string;
  search: string;
};

function requestPathFromHref(href: string): string {
  const withoutProtocol = href.replace(/^https:\/\//i, "");
  const slash = withoutProtocol.indexOf("/");
  const query = withoutProtocol.indexOf("?");
  if (slash === -1) {
    if (query === -1) {
      return "/";
    }
    return `/${withoutProtocol.slice(query)}`;
  }
  return withoutProtocol.slice(slash);
}

function ipv4ToInt(address: string): number {
  const parts = address.split(".").map((part) => Number(part));
  return ((parts[0]! << 24) | (parts[1]! << 16) | (parts[2]! << 8) | parts[3]!) >>> 0;
}

function ipv4InCidr(address: string, base: string, bits: number): boolean {
  const shift = 32 - bits;
  return ipv4ToInt(address) >>> shift === ipv4ToInt(base) >>> shift;
}

function isBlockedIpv4(address: string): boolean {
  return (
    ipv4InCidr(address, "0.0.0.0", 8) ||
    ipv4InCidr(address, "10.0.0.0", 8) ||
    ipv4InCidr(address, "100.64.0.0", 10) ||
    ipv4InCidr(address, "127.0.0.0", 8) ||
    ipv4InCidr(address, "169.254.0.0", 16) ||
    ipv4InCidr(address, "172.16.0.0", 12) ||
    ipv4InCidr(address, "192.0.0.0", 24) ||
    ipv4InCidr(address, "192.0.2.0", 24) ||
    ipv4InCidr(address, "192.168.0.0", 16) ||
    ipv4InCidr(address, "198.18.0.0", 15) ||
    ipv4InCidr(address, "198.51.100.0", 24) ||
    ipv4InCidr(address, "203.0.113.0", 24) ||
    ipv4InCidr(address, "224.0.0.0", 4) ||
    ipv4InCidr(address, "240.0.0.0", 4)
  );
}

function expandIpv6(address: string): string {
  const [head, tail] = address.split("::");
  const headParts = head ? head.split(":") : [];
  const tailParts = tail ? tail.split(":") : [];
  const missing = 8 - headParts.length - tailParts.length;
  const filled = [
    ...headParts,
    ...Array.from({ length: missing }, () => "0"),
    ...tailParts,
  ];
  return filled.map((part) => part.padStart(4, "0")).join(":");
}

function isBlockedIpv6(address: string): boolean {
  const lower = address.toLowerCase();
  if (lower === "::" || lower === "::1") {
    return true;
  }
  if (lower.startsWith("::ffff:")) {
    const mapped = lower.slice("::ffff:".length);
    if (isIP(mapped) === 4) {
      return isBlockedIpv4(mapped);
    }
  }
  const full = expandIpv6(lower);
  const first = Number.parseInt(full.slice(0, 4), 16);
  if ((first & 0xfe00) === 0xfc00) {
    return true;
  }
  if ((first & 0xffc0) === 0xfe80) {
    return true;
  }
  if ((first & 0xff00) === 0xff00) {
    return true;
  }
  if (full.startsWith("2001:0db8:")) {
    return true;
  }
  if (full.startsWith("0064:ff9b:")) {
    return true;
  }
  return false;
}

export function isBlockedAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    return isBlockedIpv4(address);
  }
  if (family === 6) {
    return isBlockedIpv6(address);
  }
  return true;
}

export function validateTargetUrl(raw: string): ValidatedTarget {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new HttpError(400, "invalid_destination", "target is not a valid URL.", "validation");
  }
  if (url.protocol !== "https:") {
    throw new HttpError(400, "invalid_destination", "target must be https.", "validation");
  }
  if (url.port && url.port !== "443") {
    throw new HttpError(400, "invalid_destination", "target must use port 443.", "validation");
  }
  if (url.username || url.password) {
    throw new HttpError(400, "invalid_destination", "target must not include userinfo.", "validation");
  }
  if (url.hash) {
    throw new HttpError(400, "invalid_destination", "target must not include a fragment.", "validation");
  }
  if (!url.hostname) {
    throw new HttpError(400, "invalid_destination", "target is missing a hostname.", "validation");
  }
  if (isIP(url.hostname) && isBlockedAddress(url.hostname)) {
    throw new HttpError(400, "invalid_destination", "target address is not globally routable.", "validation");
  }
  return {
    href: raw,
    hostname: url.hostname,
    hostHeader: url.host,
    requestPath: requestPathFromHref(raw),
    search: url.search,
  };
}

export function redactTarget(raw: string): string {
  try {
    const url = new URL(raw);
    return `${url.protocol}//${url.host}/<redacted>`;
  } catch {
    return "<invalid>";
  }
}
