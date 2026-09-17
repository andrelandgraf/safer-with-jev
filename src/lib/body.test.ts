import { describe, expect, test } from "vitest";
import { readBoundedBody } from "./body";

describe("readBoundedBody", () => {
  test("aborts a stalled stream when the deadline fires", async () => {
    const init: RequestInit & { duplex: "half" } = {
      method: "POST",
      body: new ReadableStream({
        pull(controller) {
          controller.enqueue(new Uint8Array([1]));
          return new Promise(() => undefined);
        },
      }),
      duplex: "half",
    };
    const request = new Request("https://demo.test", init);
    const deadline = AbortSignal.timeout(30);
    await expect(readBoundedBody(request, 100, deadline)).rejects.toThrow(/Timed out|deadline/);
  });
});
