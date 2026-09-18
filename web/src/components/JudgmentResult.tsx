"use client";

import { useEffect, useRef, useState } from "react";
import { askInterpretation, gateInterpretation, type AskResult, type InspectResult } from "@/lib/interpret";
import type { InspectFailure } from "@/lib/inspect";

export type ResultState =
  | { kind: "idle" }
  | { kind: "pending" }
  | { kind: "ok"; result: AskResult | InspectResult; roundtripMs: number }
  | InspectFailure;

function WirePending() {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    const started = performance.now();
    const id = window.setInterval(() => {
      setMs(Math.round(performance.now() - started));
    }, 100);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div className="result is-pending" role="status" aria-live="polite" aria-busy="true">
      <p className="result-kicker">On the wire</p>
      <p className="result-label">{(ms / 1000).toFixed(1)}s</p>
      <div className="wire" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}

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
  scroll = true,
}: {
  state: ResultState;
  image?: boolean;
  scroll?: boolean;
}) {
  const anchor = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!scroll || state.kind === "idle") {
      return;
    }
    const node = anchor.current;
    if (!node) {
      return;
    }
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    node.scrollIntoView({ block: "center", behavior: reduce ? "auto" : "smooth" });
  }, [scroll, state.kind]);
  if (state.kind === "idle") {
    return null;
  }
  return <div ref={anchor}>{resultBody(state, image)}</div>;
}

function resultBody(state: Exclude<ResultState, { kind: "idle" }>, image: boolean) {
  if (state.kind === "pending") {
    return <WirePending />;
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
