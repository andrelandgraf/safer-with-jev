import { TypeSafeClient, choice } from "@typesafe-ai/sdk";
import { isJob, type Job } from "./jobs";

const JOB_CRITERIA = {
  main: "Implement, write, or do the primary work. Everyday coding, drafting, answering, generating.",
  plan_review: "Review or produce a plan, spec, or design critique.",
  sec_review: "Security review: authentication, secrets, injection, access control.",
  eng_review: "Engineering review: correctness, tests, error handling, code quality.",
} as const;

export async function classifyJob(options: {
  prompt: string;
  client: TypeSafeClient;
}): Promise<Job> {
  if (!options.prompt) {
    throw new Error(
      "Cannot classify an empty prompt; pass model=main, model=review, or a catalog id",
    );
  }

  const { answers } = await options.client.systemOne({
    model: "jev-latest",
    state: { prompt: options.prompt },
    questions: {
      job: choice("Which job should handle this request?", JOB_CRITERIA),
    },
  });

  const selected = answers.job.choice;
  if (!isJob(selected)) {
    throw new Error(`TypeSafe returned unknown job: ${String(selected)}`);
  }
  return selected;
}
