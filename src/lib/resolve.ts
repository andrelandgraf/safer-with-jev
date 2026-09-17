import {
  catalogIdForJob,
  resolveModelField,
  type Job,
} from "./jobs";
import { classifyJob } from "./classify";
import type { TypeSafeClient } from "@typesafe-ai/sdk";

export async function resolveCatalogModel(options: {
  modelField: unknown;
  prompt: string;
  client: TypeSafeClient;
}): Promise<{ job: Job | null; catalogId: string }> {
  const raw =
    typeof options.modelField === "string" ? options.modelField : undefined;
  const resolved = resolveModelField(raw);

  switch (resolved.kind) {
    case "job":
      return { job: resolved.job, catalogId: resolved.catalogId };
    case "catalog":
      return { job: null, catalogId: resolved.catalogId };
    case "auto": {
      const job = await classifyJob({
        prompt: options.prompt,
        client: options.client,
      });
      return { job, catalogId: catalogIdForJob(job) };
    }
    default: {
      const _exhaustive: never = resolved;
      return _exhaustive;
    }
  }
}
