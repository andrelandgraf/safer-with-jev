"use client";

import { useRef, useState } from "react";
import { apiOrigin } from "@/lib/api-origin";
import { fetchInspect, type InspectCall, type InspectOutcome } from "@/lib/inspect";
import type { ResultState } from "./JudgmentResult";

const MIN_PENDING_MS = 700;

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
    const pendingStarted = performance.now();
    const outcome: InspectOutcome = await fetchInspect(apiOrigin(), call, controller.signal);
    const hold = MIN_PENDING_MS - (performance.now() - pendingStarted);
    if (hold > 0) {
      await new Promise<void>((resolve) => {
        const timer = window.setTimeout(resolve, hold);
        controller.signal.addEventListener(
          "abort",
          () => {
            window.clearTimeout(timer);
            resolve();
          },
          { once: true },
        );
      });
    }
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
