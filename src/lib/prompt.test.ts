import { describe, expect, test } from "vitest";
import { promptFromChatBody, promptFromResponsesBody } from "./prompt";

describe("promptFromChatBody", () => {
  test("returns the last user string message", () => {
    expect(
      promptFromChatBody({
        messages: [
          { role: "system", content: "ignore" },
          { role: "user", content: "first" },
          { role: "assistant", content: "ok" },
          { role: "user", content: "review this plan" },
        ],
      }),
    ).toBe("review this plan");
  });

  test("joins text parts on a content array", () => {
    expect(
      promptFromChatBody({
        messages: [
          {
            role: "user",
            content: [{ type: "text", text: "sec" }, { type: "text", text: "review" }],
          },
        ],
      }),
    ).toBe("sec\nreview");
  });
});

describe("promptFromResponsesBody", () => {
  test("reads a string input", () => {
    expect(promptFromResponsesBody({ input: "write the handler" })).toBe(
      "write the handler",
    );
  });
});
