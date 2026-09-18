"use client";

import { useRef, useState } from "react";
import { apiOrigin } from "@/lib/api-origin";
import { fetchInspect, type InspectCall, type InspectOutcome } from "@/lib/inspect";
import type { ResultState } from "./JudgmentResult";

export function useInspectCall() {
  const [state, setState] = useState<ResultState>({ kind: "idle" });
  const generation = useRef(0);
  const abort = useRef<AbortController | null>(null);

  function invalidate() {
    abort.current?.abort();
    generation.current += 1;
    abort.current = null;
    setState((current) => (current.kind === "idle" ? current : { kind: "idle" }));
  }

  async function run(call: InspectCall) {
    abort.current?.abort();
    const mine = generation.current + 1;
    generation.current = mine;
    const controller = new AbortController();
    abort.current = controller;
    setState({ kind: "pending" });
    const outcome: InspectOutcome = await fetchInspect(apiOrigin(), call, controller.signal);
    if (mine !== generation.current) {
      return;
    }
    if (outcome.kind === "aborted") {
      setState({ kind: "idle" });
      return;
    }
    setState(outcome);
  }

  return { state, run, invalidate };
}
