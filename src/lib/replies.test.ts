import { describe, expect, test } from "vitest";
import { parseReplyBody } from "./replies";

describe("parseReplyBody", () => {
  test("accepts plain text", () => {
    expect(parseReplyBody(new TextEncoder().encode("The capital is Paris."), "text/plain")).toMatchObject({
      protocol: "plain-reply",
      text: "The capital is Paris.",
    });
  });

  test("accepts a chat completion message", () => {
    const body = {
      choices: [{ message: { role: "assistant", content: "Hello" } }],
    };
    expect(parseReplyBody(new TextEncoder().encode(JSON.stringify(body)), "application/json")).toMatchObject({
      protocol: "chat-completion-reply",
      text: "Hello",
    });
  });
});
