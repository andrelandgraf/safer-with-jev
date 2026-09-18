import { describe, expect, test } from "vitest";
import { prefillOrEmpty, singleQueryParam } from "./query";

describe("singleQueryParam", () => {
  test("treats missing, empty, and repeated separately", () => {
    expect(singleQueryParam({}, "q")).toEqual({ kind: "missing" });
    expect(singleQueryParam({ q: "Hi" }, "q")).toEqual({ kind: "value", value: "Hi" });
    expect(singleQueryParam({ q: "" }, "q")).toEqual({ kind: "value", value: "" });
    expect(singleQueryParam({ q: ["a", "b"] }, "q")).toEqual({ kind: "repeated" });
  });
});

describe("prefillOrEmpty", () => {
  test("uses fallback only when the param is absent", () => {
    expect(prefillOrEmpty({ kind: "missing" }, "default")).toBe("default");
    expect(prefillOrEmpty({ kind: "value", value: "" }, "default")).toBe("");
    expect(prefillOrEmpty({ kind: "repeated" }, "default")).toBe("");
  });
});
