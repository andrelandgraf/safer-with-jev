import { describe, expect, test } from "vitest";
import { askBody, inspectBody } from "./response";
import { judgmentFromAnswers } from "./policy";

describe("inspectBody", () => {
  test("returns allow, action, and rounded jevMs", () => {
    const judgment = judgmentFromAnswers({
      nouls: { instruction_override: 0.99, instruction_disclosure: 0.48 },
      severity: 2.13,
      basis: "text",
    });
    expect(inspectBody(judgment, 44.6)).toEqual({
      allow: false,
      action: "block",
      jevMs: 45,
    });
  });
});

describe("askBody", () => {
  test("returns noul and rounded jevMs", () => {
    expect(askBody(0.61, 111.4)).toEqual({ noul: 0.61, jevMs: 111 });
  });
});
