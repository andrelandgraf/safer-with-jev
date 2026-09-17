export const JOBS = [
  "main",
  "plan_review",
  "sec_review",
  "eng_review",
] as const;

export type Job = (typeof JOBS)[number];

export const CATALOG_MODEL = {
  main: "grok-4-6",
  plan_review: "gpt-6-astra",
  sec_review: "gpt-6-astra",
  eng_review: "gpt-6-astra",
} as const satisfies Record<Job, string>;

export type ResolvedModel =
  | { kind: "job"; job: Job; catalogId: string }
  | { kind: "auto" }
  | { kind: "catalog"; catalogId: string };

const ALIASES: Record<string, Job | "auto"> = {
  auto: "auto",
  main: "main",
  grok: "main",
  "grok-4-6": "main",
  "grok-4.6": "main",
  review: "plan_review",
  astra: "plan_review",
  "gpt-6-astra": "plan_review",
  plan: "plan_review",
  "plan-review": "plan_review",
  plan_review: "plan_review",
  sec: "sec_review",
  "sec-review": "sec_review",
  sec_review: "sec_review",
  eng: "eng_review",
  "eng-review": "eng_review",
  eng_review: "eng_review",
};

export function isJob(value: string): value is Job {
  return (JOBS as readonly string[]).includes(value);
}

export function catalogIdForJob(job: Job): string {
  return CATALOG_MODEL[job];
}

export function resolveModelField(model: string | undefined): ResolvedModel {
  const trimmed = model?.trim();
  if (!trimmed) {
    return { kind: "auto" };
  }

  const alias = ALIASES[trimmed.toLowerCase()];
  if (alias === "auto") {
    return { kind: "auto" };
  }
  if (alias) {
    return { kind: "job", job: alias, catalogId: catalogIdForJob(alias) };
  }

  return { kind: "catalog", catalogId: trimmed };
}

export function aliasModels(): { id: string; job: Job | "auto"; catalogId: string | null }[] {
  return [
    { id: "auto", job: "auto", catalogId: null },
    { id: "main", job: "main", catalogId: CATALOG_MODEL.main },
    { id: "review", job: "plan_review", catalogId: CATALOG_MODEL.plan_review },
    { id: "plan-review", job: "plan_review", catalogId: CATALOG_MODEL.plan_review },
    { id: "sec-review", job: "sec_review", catalogId: CATALOG_MODEL.sec_review },
    { id: "eng-review", job: "eng_review", catalogId: CATALOG_MODEL.eng_review },
    { id: "astra", job: "plan_review", catalogId: CATALOG_MODEL.plan_review },
  ];
}
