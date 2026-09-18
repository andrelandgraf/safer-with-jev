"use client";

import { FormEvent, type ReactNode, useState } from "react";
import {
  ASK_EXAMPLES,
  NICE_TRY_EXAMPLES,
  PROMPT_EXAMPLES,
  REPLY_EXAMPLES,
  TEXT_MAX_BYTES,
} from "@/lib/examples";
import { SHARE_PAGES, type ShareSlug } from "@/lib/site";
import { JudgmentResult } from "./JudgmentResult";
import { useInspectCall } from "./useInspectCall";

const PRIVACY = "Use throwaway demo content. Query strings can appear in browser history and logs.";

function ExampleRow({ children }: { children: ReactNode }) {
  return <p className="demo-more">{children}</p>;
}

export function AskDemo({
  initialQ,
  initialT,
  repeated,
}: {
  initialQ: string;
  initialT: string;
  repeated: boolean;
}) {
  const inspect = useInspectCall();
  const [q, setQ] = useState(initialQ);
  const [t, setT] = useState(initialT);
  const [repeatError, setRepeatError] = useState(repeated);

  function submit(event: FormEvent) {
    event.preventDefault();
    if (repeatError) {
      return;
    }
    void inspect.run({ kind: "ask", q, t });
  }

  return (
    <main className="share">
      <h2>Safer with Jev</h2>
      <h1>
        {SHARE_PAGES["ask-jev"].cardLine1}
        <br />
        {SHARE_PAGES["ask-jev"].cardLine2}
      </h1>
      <p>
        <a href="/">safer-with-jev.com</a>
      </p>
      <p>{PRIVACY}</p>
      {repeatError ? <p role="alert">q and t must each appear once. Edit the fields or pick an example.</p> : null}
      <ExampleRow>
        {ASK_EXAMPLES.map((example) => (
          <button
            key={example.id}
            type="button"
            className="chip"
            disabled={inspect.state.kind === "pending"}
            onClick={() => {
              inspect.invalidate();
              setRepeatError(false);
              setQ(example.q);
              setT(example.t);
            }}
          >
            {example.label}
          </button>
        ))}
      </ExampleRow>
      <form onSubmit={submit}>
        <label htmlFor="q">Question</label>
        <input
          id="q"
          name="q"
          value={q}
          disabled={inspect.state.kind === "pending"}
          onChange={(event) => {
            inspect.invalidate();
            setRepeatError(false);
            setQ(event.target.value);
          }}
        />
        <label htmlFor="t">Text</label>
        <textarea
          id="t"
          name="t"
          rows={6}
          value={t}
          disabled={inspect.state.kind === "pending"}
          onChange={(event) => {
            inspect.invalidate();
            setRepeatError(false);
            setT(event.target.value);
          }}
        />
        <button type="submit" disabled={inspect.state.kind === "pending" || repeatError}>
          {inspect.state.kind === "pending" ? "On the wire" : "Ask Jev"}
        </button>
      </form>
      <JudgmentResult state={inspect.state} />
    </main>
  );
}

function TextDemo({
  slug,
  examples,
  initial,
  path,
  callKind,
  submitLabel,
  fieldLabel,
  note,
}: {
  slug: Exclude<ShareSlug, "ask-jev">;
  examples: { id: string; label: string; text: string }[];
  initial: string;
  path?: "/block-prompt-injections" | "/block-unsafe-replies";
  callKind: "nice-try" | "text";
  submitLabel: string;
  fieldLabel: string;
  note?: string;
}) {
  const inspect = useInspectCall();
  const [text, setText] = useState(initial);
  const [sizeError, setSizeError] = useState<string | null>(null);
  const copy = SHARE_PAGES[slug];

  function submit(event: FormEvent) {
    event.preventDefault();
    if (new TextEncoder().encode(text).length > TEXT_MAX_BYTES) {
      setSizeError("Text must be 256 KiB or smaller.");
      return;
    }
    setSizeError(null);
    if (callKind === "nice-try") {
      void inspect.run({ kind: "nice-try", p: text });
      return;
    }
    if (!path) {
      return;
    }
    void inspect.run({ kind: "text", path, body: text });
  }

  return (
    <main className="share">
      <h2>Safer with Jev</h2>
      <h1>
        {copy.cardLine1}
        <br />
        {copy.cardLine2}
      </h1>
      <p>
        <a href="/">safer-with-jev.com</a>
      </p>
      <p>{PRIVACY}</p>
      {note ? <p>{note}</p> : null}
      <ExampleRow>
        {examples.map((example) => (
          <button
            key={example.id}
            type="button"
            className="chip"
            disabled={inspect.state.kind === "pending"}
            onClick={() => {
              inspect.invalidate();
              setSizeError(null);
              setText(example.text);
            }}
          >
            {example.label}
          </button>
        ))}
      </ExampleRow>
      <form onSubmit={submit}>
        <label htmlFor="body">{fieldLabel}</label>
        <textarea
          id="body"
          name="body"
          rows={8}
          value={text}
          disabled={inspect.state.kind === "pending"}
          onChange={(event) => {
            inspect.invalidate();
            setSizeError(null);
            setText(event.target.value);
          }}
        />
        {sizeError ? <p role="alert">{sizeError}</p> : null}
        <button type="submit" disabled={inspect.state.kind === "pending"}>
          {inspect.state.kind === "pending" ? "On the wire" : submitLabel}
        </button>
      </form>
      <JudgmentResult state={inspect.state} />
    </main>
  );
}

export function NiceTryDemo({ initial }: { initial: string }) {
  return (
    <TextDemo
      slug="nice-try"
      examples={NICE_TRY_EXAMPLES}
      initial={initial}
      callKind="nice-try"
      submitLabel="Try it"
      fieldLabel="Untrusted prompt"
    />
  );
}

export function PromptDemo({ initial }: { initial: string }) {
  return (
    <TextDemo
      slug="block-prompt-injections"
      examples={PROMPT_EXAMPLES}
      initial={initial}
      path="/block-prompt-injections"
      callKind="text"
      submitLabel="Inspect prompt"
      fieldLabel="Untrusted prompt"
    />
  );
}

export function ReplyDemo({ initial }: { initial: string }) {
  return (
    <TextDemo
      slug="block-unsafe-replies"
      examples={REPLY_EXAMPLES}
      initial={initial}
      path="/block-unsafe-replies"
      callKind="text"
      submitLabel="Inspect reply"
      fieldLabel="Assistant reply"
      note="Jev may flag credential-shaped text even when it is invented."
    />
  );
}
