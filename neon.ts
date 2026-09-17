import { defineConfig } from "@neon/config/v1";

export default defineConfig({
  aiGateway: true,
  functions: {
    gateway: {
      name: "Safer with Jev",
      source: "src/index.ts",
      customDomains: ["safer-with-jev.com"],
      env: {
        TYPESAFE_API_KEY: process.env.TYPESAFE_API_KEY!,
        // Functions load path runs parseEnv and requires this; the runtime does not inject it.
        NEON_FUNCTION_GATEWAY_BASE_URL:
          process.env.NEON_FUNCTION_GATEWAY_BASE_URL!,
      },
    },
  },
});
