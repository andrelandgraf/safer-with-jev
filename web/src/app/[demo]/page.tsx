import { notFound } from "next/navigation";
import { AskDemo, ImageDemo, NiceTryDemo, PromptDemo, ReplyDemo } from "@/components/Demos";
import { demoMetadata } from "@/lib/metadata";
import { ASK_EXAMPLES, NICE_TRY_EXAMPLES } from "@/lib/examples";
import { prefillOrEmpty, singleQueryParam } from "@/lib/query";
import { isShareSlug, SHARE_SLUGS, type ShareSlug } from "@/lib/site";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return SHARE_SLUGS.map((demo) => ({ demo }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ demo: string }> }) {
  const { demo } = await params;
  if (!isShareSlug(demo)) {
    return {};
  }
  return demoMetadata(demo);
}

export default async function DemoPage({
  params,
  searchParams,
}: {
  params: Promise<{ demo: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { demo } = await params;
  if (!isShareSlug(demo)) {
    notFound();
  }
  const query = await searchParams;
  return <Demo slug={demo} query={query} />;
}

function Demo({
  slug,
  query,
}: {
  slug: ShareSlug;
  query: Record<string, string | string[] | undefined>;
}) {
  if (slug === "ask-jev") {
    const q = singleQueryParam(query, "q");
    const t = singleQueryParam(query, "t");
    const repeated = q.kind === "repeated" || t.kind === "repeated";
    return (
      <AskDemo
        initialQ={prefillOrEmpty(q, ASK_EXAMPLES[0]?.q ?? "")}
        initialT={prefillOrEmpty(t, ASK_EXAMPLES[0]?.t ?? "")}
        repeated={repeated}
      />
    );
  }
  if (slug === "nice-try") {
    const p = singleQueryParam(query, "p");
    return <NiceTryDemo initial={prefillOrEmpty(p, NICE_TRY_EXAMPLES[0]?.text ?? "")} />;
  }
  if (slug === "block-prompt-injections") {
    return <PromptDemo initial="" />;
  }
  if (slug === "block-unsafe-replies") {
    return <ReplyDemo initial="" />;
  }
  return <ImageDemo />;
}
