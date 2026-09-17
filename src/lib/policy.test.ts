import { describe, expect, test } from "vitest";
import { decideAction, judgmentFromAnswers } from "./policy";

describe("decideAction", () => {
  test("blocks at noul 0.70 regardless of low severity", () => {
    expect(decideAction({ a: 0.7 }, 0)).toBe("block");
  });

  test("reviews mid noul when severity is below 2", () => {
    expect(decideAction({ a: 0.35 }, 1.9)).toBe("review");
  });

  test("blocks mid noul when severity is at least 2", () => {
    expect(decideAction({ a: 0.35 }, 2)).toBe("block");
  });

  test("passes when every noul is below review", () => {
    expect(decideAction({ a: 0.34, b: 0 }, 3)).toBe("pass");
  });
});

describe("judgmentFromAnswers", () => {
  test("allow is true only for pass", () => {
    const pass = judgmentFromAnswers({
      nouls: { a: 0.1 },
      severity: 0.2,
      basis: "text",
    });
    expect(pass.allow).toBe(true);
    expect(pass.action).toBe("pass");
    expect(pass.policy).toBe("demo-v1");
  });

  test("rejects probabilities outside 0..1", () => {
    expect(() =>
      judgmentFromAnswers({ nouls: { a: 1.01 }, severity: 0, basis: "text" }),
    ).toThrow(/Invalid noul/);
  });
});
