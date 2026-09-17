import { describe, expect, test } from "vitest";
import {
  aliasModels,
  catalogIdForJob,
  resolveModelField,
} from "./jobs";

describe("resolveModelField", () => {
  test("omitted and auto classify through Jev", () => {
    expect(resolveModelField(undefined)).toEqual({ kind: "auto" });
    expect(resolveModelField("")).toEqual({ kind: "auto" });
    expect(resolveModelField("  auto  ")).toEqual({ kind: "auto" });
  });

  test("main-work aliases map to grok-4-6", () => {
    for (const alias of ["main", "GROK", "grok-4-6", "grok-4.6"]) {
      expect(resolveModelField(alias)).toEqual({
        kind: "job",
        job: "main",
        catalogId: "grok-4-6",
      });
    }
  });

  test("review aliases map to gpt-6-astra", () => {
    expect(resolveModelField("plan-review")).toEqual({
      kind: "job",
      job: "plan_review",
      catalogId: "gpt-6-astra",
    });
    expect(resolveModelField("sec_review")).toEqual({
      kind: "job",
      job: "sec_review",
      catalogId: "gpt-6-astra",
    });
    expect(resolveModelField("eng-review")).toEqual({
      kind: "job",
      job: "eng_review",
      catalogId: "gpt-6-astra",
    });
    expect(resolveModelField("astra")).toEqual({
      kind: "job",
      job: "plan_review",
      catalogId: "gpt-6-astra",
    });
  });

  test("unknown ids pass through to the gateway catalog", () => {
    expect(resolveModelField("claude-sonnet-4-6")).toEqual({
      kind: "catalog",
      catalogId: "claude-sonnet-4-6",
    });
  });
});

describe("catalogIdForJob", () => {
  test("main work is grok-4-6; reviews are gpt-6-astra", () => {
    expect(catalogIdForJob("main")).toBe("grok-4-6");
    expect(catalogIdForJob("plan_review")).toBe("gpt-6-astra");
    expect(catalogIdForJob("sec_review")).toBe("gpt-6-astra");
    expect(catalogIdForJob("eng_review")).toBe("gpt-6-astra");
  });
});

describe("aliasModels", () => {
  test("exposes the aliases a client can send as model", () => {
    const ids = aliasModels().map((row) => row.id);
    expect(ids).toEqual([
      "auto",
      "main",
      "review",
      "plan-review",
      "sec-review",
      "eng-review",
      "astra",
    ]);
  });
});
