import { describe, expect, test } from "vitest";
import {
  askInterpretation,
  gateInterpretation,
  noulLabel,
  parseAskResult,
  parseInspectResult,
} from "./interpret";

describe("noulLabel", () => {
  test("uses the documented bands", () => {
    expect(noulLabel(0)).toBe("No");
    expect(noulLabel(0.3)).toBe("No");
    expect(noulLabel(0.30000000000000004)).toBe("Uncertain");
    expect(noulLabel(0.69)).toBe("Uncertain");
    expect(noulLabel(0.7)).toBe("Yes");
    expect(noulLabel(1)).toBe("Yes");
  });
});

describe("parseAskResult", () => {
  test("accepts a public ask body", () => {
    expect(parseAskResult({ noul: 0.98, jevMs: 45 })).toEqual({
      kind: "ask",
      noul: 0.98,
      jevMs: 45,
    });
  });

  test("rejects out of range noul and fractional jevMs", () => {
    expect(() => parseAskResult({ noul: 1.2, jevMs: 1 })).toThrow(/noul/);
    expect(() => parseAskResult({ noul: 0.5, jevMs: 1.5 })).toThrow(/jevMs/);
  });
});

describe("parseInspectResult", () => {
  test("rejects allow that disagrees with action", () => {
    expect(() => parseInspectResult({ allow: true, action: "block", jevMs: 1 })).toThrow(
      /allow does not match/,
    );
  });

  test("accepts a public inspect body", () => {
    expect(parseInspectResult({ allow: false, action: "block", jevMs: 12 })).toEqual({
      kind: "inspect",
      allow: false,
      action: "block",
      jevMs: 12,
    });
  });
});

describe("copy", () => {
  test("ask interpretation includes the percent", () => {
    expect(askInterpretation(0.98)).toEqual({
      label: "Yes",
      detail: 'Jev estimates a 98% probability of "yes" to your question.',
    });
  });

  test("gate copy names the demo policy", () => {
    expect(gateInterpretation("pass")).toContain("demo policy");
    expect(gateInterpretation("review")).toContain("no review queue");
    expect(gateInterpretation("block")).toContain("refuse forwarding");
  });
});
