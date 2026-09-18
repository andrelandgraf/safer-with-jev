import { describe, expect, test } from "vitest";
import { negotiateAccept } from "./accept";

describe("negotiateAccept", () => {
  test("defaults to HTML", () => {
    expect(negotiateAccept(null)).toEqual({ kind: "html" });
    expect(negotiateAccept("")).toEqual({ kind: "html" });
    expect(negotiateAccept("*/*")).toEqual({ kind: "html" });
    expect(negotiateAccept("text/*")).toEqual({ kind: "html" });
    expect(negotiateAccept("text/html,application/xhtml+xml,*/*;q=0.8")).toEqual({ kind: "html" });
  });

  test("selects documentation only when named and strictly better than HTML", () => {
    expect(negotiateAccept("text/markdown")).toEqual({ kind: "markdown" });
    expect(negotiateAccept("text/plain")).toEqual({ kind: "plain" });
    expect(negotiateAccept("text/markdown;q=0.9,text/html;q=0.5")).toEqual({ kind: "markdown" });
    expect(negotiateAccept("text/plain;q=0.9,text/html;q=0.5")).toEqual({ kind: "plain" });
    expect(negotiateAccept("text/markdown;q=0.5,text/html;q=0.5")).toEqual({ kind: "html" });
    expect(negotiateAccept("text/markdown;q=0.8,*/*;q=1")).toEqual({ kind: "html" });
    expect(negotiateAccept("text/html;q=0,text/markdown;q=1")).toEqual({ kind: "markdown" });
    expect(negotiateAccept("text/markdown;q=0.8,text/plain;q=0.8")).toEqual({ kind: "markdown" });
  });

  test("treats RSC Accept as HTML", () => {
    expect(negotiateAccept("text/x-component")).toEqual({ kind: "html" });
    expect(negotiateAccept("text/x-component,text/html;q=0.9")).toEqual({ kind: "html" });
  });

  test("returns 406 when HTML is excluded and documentation is not asked for", () => {
    expect(negotiateAccept("text/html;q=0,*/*;q=1")).toEqual({ kind: "not_acceptable" });
    expect(negotiateAccept("application/json")).toEqual({ kind: "not_acceptable" });
  });

  test("malformed q is zero", () => {
    expect(negotiateAccept("text/markdown;q=2,text/html")).toEqual({ kind: "html" });
    expect(negotiateAccept("text/markdown;q=0.1234,text/html;q=0.1")).toEqual({ kind: "html" });
  });
});
