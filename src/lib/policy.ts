import { NOUL_BLOCK, NOUL_REVIEW, POLICY, SEVERITY_BLOCK } from "./limits";

export type JudgmentAction = "pass" | "review" | "block";
export type JudgmentBasis = "text" | "vision-caption";

export type Judgment = {
  allow: boolean;
  action: JudgmentAction;
  nouls: Record<string, number>;
  severity: number;
  policy: typeof POLICY;
  basis: JudgmentBasis;
};

export function decideAction(nouls: Record<string, number>, severity: number): JudgmentAction {
  const values = Object.values(nouls);
  if (values.some((value) => value >= NOUL_BLOCK)) {
    return "block";
  }
  if (values.some((value) => value >= NOUL_REVIEW)) {
    return severity >= SEVERITY_BLOCK ? "block" : "review";
  }
  return "pass";
}

export function judgmentFromAnswers(input: {
  nouls: Record<string, number>;
  severity: number;
  basis: JudgmentBasis;
}): Judgment {
  for (const [name, value] of Object.entries(input.nouls)) {
    if (!Number.isFinite(value) || value < 0 || value > 1) {
      throw new Error(`Invalid noul probability for ${name}`);
    }
  }
  if (!Number.isFinite(input.severity) || input.severity < 0 || input.severity > 3) {
    throw new Error("Invalid severity");
  }
  const action = decideAction(input.nouls, input.severity);
  return {
    allow: action === "pass",
    action,
    nouls: input.nouls,
    severity: input.severity,
    policy: POLICY,
    basis: input.basis,
  };
}
