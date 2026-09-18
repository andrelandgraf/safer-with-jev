import { Landing } from "@/components/Landing";
import { SITE_MARKDOWN } from "@/generated/site-markdown";

export const dynamic = "force-dynamic";

export default function Home() {
  return <Landing markdown={SITE_MARKDOWN} />;
}
