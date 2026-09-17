import { describe, expect, test } from "vitest";
import { parseRouting } from "./routing";

function request(path: string, init?: RequestInit): Request {
  return new Request(`https://safer.example${path}`, {
    method: "POST",
    ...init,
  });
}

describe("parseRouting", () => {
  test("inspects POST without target", () => {
    const routing = parseRouting(request("/block-prompt-injections"));
    expect(routing).toEqual({ kind: "inspect", route: "block-prompt-injections" });
  });

  test("forwards POST prompt injections with target", () => {
    const routing = parseRouting(
      request("/block-prompt-injections?target=https%3A%2F%2Fapi.openai.com%2Fv1%2Fchat%2Fcompletions"),
    );
    expect(routing.kind).toBe("model");
    if (routing.kind === "model") {
      expect(routing.target.hostname).toBe("api.openai.com");
    }
  });

  test("rejects POST image with target", () => {
    expect(() =>
      parseRouting(
        request("/block-unsafe-images?target=https%3A%2F%2Fexample.com%2Fput"),
      ),
    ).toThrow(/PUT/);
  });

  test("rejects obsolete routing inputs", () => {
    expect(() =>
      parseRouting(
        request("/block-prompt-injections", { headers: { "x-safer-target": "https://x" } }),
      ),
    ).toThrow(/not accepted/);
    expect(() => parseRouting(request("/block-prompt-injections?destination=put"))).toThrow(
      /not accepted/,
    );
  });

  test("rejects PUT with Authorization", () => {
    expect(() =>
      parseRouting(
        new Request("https://safer.example/block-unsafe-images?target=https://example.com/x", {
          method: "PUT",
          headers: { authorization: "Bearer x" },
        }),
      ),
    ).toThrow(/presigned/);
  });

  test("404s OpenAI layout paths", () => {
    expect(() => parseRouting(request("/v1/chat/completions"))).toThrow(/Not found/);
  });
});
