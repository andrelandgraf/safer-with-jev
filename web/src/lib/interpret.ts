export type JudgmentAction = "pass" | "review" | "block";
export type NoulLabel = "Yes" | "No" | "Uncertain";

export type AskResult = {
  kind: "ask";
  noul: number;
  jevMs: number;
};

export type InspectResult = {
  kind: "inspect";
  allow: boolean;
  action: JudgmentAction;
  jevMs: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAction(value: unknown): value is JudgmentAction {
  return value === "pass" || value === "review" || value === "block";
}

function parseJevMs(value: unknown): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 0) {
    throw new Error("jevMs must be a nonnegative integer.");
  }
  return value;
}

export function parseAskResult(value: unknown): AskResult {
  if (!isRecord(value)) {
    throw new Error("Ask response was not an object.");
  }
  if (typeof value.noul !== "number" || !Number.isFinite(value.noul) || value.noul < 0 || value.noul > 1) {
    throw new Error("noul must be a number between 0 and 1.");
  }
  return { kind: "ask", noul: value.noul, jevMs: parseJevMs(value.jevMs) };
}

export function parseInspectResult(value: unknown): InspectResult {
  if (!isRecord(value)) {
    throw new Error("Inspect response was not an object.");
  }
  if (!isAction(value.action)) {
    throw new Error("action must be pass, review, or block.");
  }
  if (typeof value.allow !== "boolean") {
    throw new Error("allow must be a boolean.");
  }
  if (value.allow !== (value.action === "pass")) {
    throw new Error("allow does not match action.");
  }
  return {
    kind: "inspect",
    allow: value.allow,
    action: value.action,
    jevMs: parseJevMs(value.jevMs),
  };
}

export function noulLabel(noul: number): NoulLabel {
  if (noul <= 0.3) {
    return "No";
  }
  if (noul < 0.7) {
    return "Uncertain";
  }
  return "Yes";
}

export function askInterpretation(noul: number): { label: NoulLabel; detail: string } {
  const label = noulLabel(noul);
  const percent = Math.round(noul * 100);
  return {
    label,
    detail: `Jev estimates a ${percent}% probability of "yes" to your question.`,
  };
}

export function gateInterpretation(action: JudgmentAction): string {
  if (action === "pass") {
    return "Pass. Jev's judgment allows this content under the demo policy.";
  }
  if (action === "review") {
    return "Review. The gate would refuse forwarding. This demo has no review queue.";
  }
  return "Block. The gate would refuse forwarding.";
}
