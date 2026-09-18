"use client";

import { askInterpretation, gateInterpretation, type AskResult, type InspectResult } from "@/lib/interpret";
import type { InspectFailure } from "@/lib/inspect";

export type ResultState =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "ok"; result: AskResult | InspectResult; roundtripMs: number }
  | InspectFailure;

function timings(roundtripMs: number, jevMs: number, image: boolean) {
  return (
    <p className="timings">
      Roundtrip: {roundtripMs} ms
      <br />
      Jev: {jevMs} ms
      <br />
      {image
        ? "Roundtrip includes transport, captioning, and other server work."
        : "Roundtrip includes transport and other server work besides the Jev call."}
    </p>
  );
}

export function JudgmentResult({
  state,
  image = false,
}: {
  state: ResultState;
  image?: boolean;
}) {
  if (state.kind === "idle") {
    return null;
  }
  if (state.kind === "pending") {
    return (
      <div className="result" role="status" aria-live="polite">
        <p className="result-kicker">Judging</p>
        <p>Jev is reading this now.</p>
      </div>
    );
  }
  if (state.kind === "error") {
    const wait =
      state.status === 429 && state.retryAfterSec !== null
        ? ` Wait ${state.retryAfterSec} seconds. Shared public limit.`
        : "";
    const id = state.requestId ? ` Request ${state.requestId}.` : "";
    return (
      <div className="result" role="alert">
        <p className="result-kicker">No judgment</p>
        <p className="result-label">The call did not finish.</p>
        <p>
          {state.message}
          {wait}
          {id}
        </p>
        {state.roundtripMs > 0 ? (
          <p className="timings">Roundtrip: {state.roundtripMs} ms</p>
        ) : null}
      </div>
    );
  }
  if (state.result.kind === "ask") {
    const copy = askInterpretation(state.result.noul);
    return (
      <div className="result" role="status" aria-live="polite">
        <p className="result-kicker">Ask Jev</p>
        <p className="result-label">{copy.label}</p>
        <p>{copy.detail}</p>
        {timings(state.roundtripMs, state.result.jevMs, false)}
        <details>
          <summary>JSON</summary>
          <pre>
            <code>{JSON.stringify({ noul: state.result.noul, jevMs: state.result.jevMs }, null, 2)}</code>
          </pre>
        </details>
      </div>
    );
  }
  const allowed = state.result.allow ? "yes" : "no";
  return (
    <div className="result" role="status" aria-live="polite">
      <p className="result-kicker">Inspect</p>
      <p className="result-label">{state.result.action === "pass" ? "Pass" : state.result.action === "review" ? "Review" : "Block"}</p>
      <p>{gateInterpretation(state.result.action)}</p>
      <p>Allowed: {allowed}. This demo inspects only. Nothing was forwarded.</p>
      {timings(state.roundtripMs, state.result.jevMs, image)}
      <details>
        <summary>JSON</summary>
        <pre>
          <code>
            {JSON.stringify(
              { allow: state.result.allow, action: state.result.action, jevMs: state.result.jevMs },
              null,
              2,
            )}
          </code>
        </pre>
      </details>
    </div>
  );
}
