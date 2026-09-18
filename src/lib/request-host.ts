const SITE_HOSTS = new Set(["safer-with-jev.com", "www.safer-with-jev.com"]);
const API_HOST = "api.safer-with-jev.com";

function hostname(value: string): string {
  return value.split(",")[0]?.trim().toLowerCase().split(":")[0] ?? "";
}

export function requestHosts(request: Request): string[] {
  const forwarded = request.headers.get("x-forwarded-host");
  const host = request.headers.get("host");
  const fromUrl = new URL(request.url).host;
  const values = [forwarded, host, fromUrl];
  const hosts: string[] = [];
  const seen = new Set<string>();
  for (const value of values) {
    if (!value) {
      continue;
    }
    const name = hostname(value);
    if (!name || seen.has(name)) {
      continue;
    }
    seen.add(name);
    hosts.push(name);
  }
  return hosts;
}

export function servesLegacySite(request: Request): boolean {
  const hosts = requestHosts(request);
  // Neon custom-domain ingress puts the original hostname on x-forwarded-host
  // and the native Function hostname on Host. api. wins so a spoofed site Host
  // cannot keep HTML routing on the API hostname.
  if (hosts.includes(API_HOST)) {
    return false;
  }
  return hosts.some((host) => SITE_HOSTS.has(host));
}
