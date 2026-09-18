import type { NextConfig } from "next";
import { apiOrigin } from "./src/lib/api-origin";

const origin = apiOrigin();

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_ORIGIN: origin,
  },
  async headers() {
    return [
      {
        source: "/",
        headers: [{ key: "Vary", value: "Accept" }],
      },
    ];
  },
  outputFileTracingIncludes: {
    "/": ["./content/AGENTS.md"],
    "/AGENTS.md": ["./content/AGENTS.md"],
    "/SITE.md": ["./content/AGENTS.md"],
  },
};

export default nextConfig;
