export function apiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_ORIGIN;
  if (!raw) {
    throw new Error("NEXT_PUBLIC_API_ORIGIN is not set");
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error("NEXT_PUBLIC_API_ORIGIN is not a valid URL");
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error("NEXT_PUBLIC_API_ORIGIN must be an origin");
  }
  if (url.pathname !== "/" && url.pathname !== "") {
    throw new Error("NEXT_PUBLIC_API_ORIGIN must not include a path");
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (url.protocol !== "https:" && !(local && url.protocol === "http:")) {
    throw new Error("NEXT_PUBLIC_API_ORIGIN must be https except on localhost");
  }
  return url.origin;
}
