"use client";

import { Fragment } from "react";
import { ASK_EXAMPLES, NICE_TRY_EXAMPLES } from "@/lib/examples";
import { chipTargetFromHref, parseMarkdown, type Block, type Inline } from "@/lib/markdown";
import { JudgmentResult } from "./JudgmentResult";
import { useInspectCall } from "./useInspectCall";

function Inlines({
  inlines,
  onChip,
}: {
  inlines: Inline[];
  onChip: (href: string) => void;
}) {
  return (
    <>
      {inlines.map((inline, index) => {
        if (inline.kind === "text") {
          return <span key={index}>{inline.text}</span>;
        }
        if (inline.kind === "code") {
          return <code key={index}>{inline.text}</code>;
        }
        if (inline.kind === "strong") {
          return <strong key={index}>{inline.text}</strong>;
        }
        if (chipTargetFromHref(inline.href)) {
          return (
            <button key={index} type="button" className="chip" onClick={() => onChip(inline.href)}>
              {inline.text}
            </button>
          );
        }
        return (
          <a key={index} href={inline.href}>
            {inline.text}
          </a>
        );
      })}
    </>
  );
}

function blockChipKind(block: Block): "ask" | "nice-try" | null {
  const inlines =
    block.kind === "list" ? block.items.flat() : block.kind === "paragraph" || block.kind === "heading" ? block.inlines : [];
  for (const inline of inlines) {
    if (inline.kind === "link") {
      const chip = chipTargetFromHref(inline.href);
      if (chip) {
        return chip.kind;
      }
    }
  }
  return null;
}

export function Landing({ markdown }: { markdown: string }) {
  const ask = useInspectCall();
  const nice = useInspectCall();
  const blocks = parseMarkdown(markdown);

  function onChip(href: string) {
    const target = chipTargetFromHref(href);
    if (!target) {
      return;
    }
    if (target.kind === "ask") {
      void ask.run({ kind: "ask", q: target.q, t: target.t });
      return;
    }
    void nice.run({ kind: "nice-try", p: target.p });
  }

  return (
    <main className="site">
      {blocks.map((block, index) => {
        const kind = blockChipKind(block);
        return (
          <Fragment key={index}>
            <MarkdownBlock block={block} onChip={onChip} />
            {kind === "ask" ? (
              <>
                <p className="demo-more">
                  {ASK_EXAMPLES.filter((example) => example.id === "sentence" || example.id === "typo").map(
                    (example) => (
                      <button
                        key={example.id}
                        type="button"
                        className="chip"
                        onClick={() => void ask.run({ kind: "ask", q: example.q, t: example.t })}
                      >
                        {example.label}
                      </button>
                    ),
                  )}
                  <a className="demo-open" href="/ask-jev">
                    Open the Ask Jev demo
                  </a>
                </p>
                <JudgmentResult state={ask.state} />
              </>
            ) : null}
            {kind === "nice-try" ? (
              <>
                <p className="demo-more">
                  {NICE_TRY_EXAMPLES.filter((example) => example.id === "autumn").map((example) => (
                    <button
                      key={example.id}
                      type="button"
                      className="chip"
                      onClick={() => void nice.run({ kind: "nice-try", p: example.text })}
                    >
                      {example.label}
                    </button>
                  ))}
                  <a className="demo-open" href="/nice-try">
                    Open the Nice try demo
                  </a>
                </p>
                <JudgmentResult state={nice.state} />
              </>
            ) : null}
          </Fragment>
        );
      })}
    </main>
  );
}

function MarkdownBlock({ block, onChip }: { block: Block; onChip: (href: string) => void }) {
  if (block.kind === "heading") {
    const Tag = (`h${block.level}` as "h1" | "h2" | "h3");
    return (
      <Tag>
        <Inlines inlines={block.inlines} onChip={onChip} />
      </Tag>
    );
  }
  if (block.kind === "paragraph") {
    return (
      <p>
        <Inlines inlines={block.inlines} onChip={onChip} />
      </p>
    );
  }
  if (block.kind === "list") {
    return (
      <ul>
        {block.items.map((item, index) => (
          <li key={index}>
            <Inlines inlines={item} onChip={onChip} />
          </li>
        ))}
      </ul>
    );
  }
  if (block.kind === "pre") {
    return (
      <pre>
        <code>{block.text}</code>
      </pre>
    );
  }
  return <hr />;
}
