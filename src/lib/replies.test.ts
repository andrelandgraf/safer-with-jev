import { describe, expect, test } from "vitest";
import { parseReplyBody } from "./replies";

describe("parseReplyBody", () => {
  test("accepts plain text", () => {
    expect(parseReplyBody(new TextEncoder().encode("The capital is Paris."), "text/plain")).toMatchObject({
      protocol: "plain-reply",
      text: "The capital is Paris.",
    });
  });

  test("inspects every chat completion choice, including function arguments", () => {
    const body = {
      choices: [
        { message: { role: "assistant", content: "Hello" } },
        {
          message: {
            role: "assistant",
            content: null,
            function_call: { name: "send", arguments: '{"to":"evil.example"}' },
          },
        },
      ],
    };
    expect(parseReplyBody(new TextEncoder().encode(JSON.stringify(body)), "application/json")).toMatchObject({
      protocol: "chat-completion-reply",
      text: "Hello",
      tool_calls: [{ name: "send", arguments: '{"to":"evil.example"}' }],
    });
  });
});
