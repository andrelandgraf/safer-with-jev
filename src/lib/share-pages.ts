import { SITE_ORIGIN } from "./homepage";
import { escapeHtml } from "./markdown";
import { renderNewsprintPage } from "./newsprint";

export const SHARE_SLUGS = [
  "ask-jev",
  "nice-try",
  "block-prompt-injections",
  "block-unsafe-replies",
] as const;

export type ShareSlug = (typeof SHARE_SLUGS)[number];

export type SharePageCopy = {
  title: string;
  description: string;
  ogTitle: string;
  ogDescription: string;
  ogImageAlt: string;
  cardLine1: string;
  cardLine2: string;
};

export const SHARE_PAGES = {
  "ask-jev": {
    title: "Ask Jev",
    description: "Ask Jev a yes-or-no question about your text.",
    ogTitle: "Ask Jev",
    ogDescription: "Ask Jev a yes-or-no question about your text.",
    ogImageAlt: "Safer with Jev. Ask Jev. Yes or no.",
    cardLine1: "Ask Jev.",
    cardLine2: "Yes or no.",
  },
  "nice-try": {
    title: "Nice try",
    description: "See whether Jev flags your prompt as an injection.",
    ogTitle: "Nice try",
    ogDescription: "See whether Jev flags your prompt as an injection.",
    ogImageAlt: "Safer with Jev. Nice try. Is that an injection?",
    cardLine1: "Nice try.",
    cardLine2: "Is that an injection?",
  },
  "block-prompt-injections": {
    title: "Block prompt injections",
    description: "Have Jev check prompts for instruction overrides and disclosure attempts.",
    ogTitle: "Block prompt injections",
    ogDescription: "Have Jev check prompts for instruction overrides and disclosure attempts.",
    ogImageAlt: "Safer with Jev. Check the prompt. Before forwarding.",
    cardLine1: "Check the prompt.",
    cardLine2: "Before forwarding.",
  },
  "block-unsafe-replies": {
    title: "Block unsafe replies",
    description: "Have Jev screen assistant replies before you send them.",
    ogTitle: "Block unsafe replies",
    ogDescription: "Have Jev screen assistant replies before you send them.",
    ogImageAlt: "Safer with Jev. Check the reply. Before you send it.",
    cardLine1: "Check the reply.",
    cardLine2: "Before you send it.",
  },
} as const satisfies Record<ShareSlug, SharePageCopy>;

export function isShareSlug(value: string): value is ShareSlug {
  return (SHARE_SLUGS as readonly string[]).includes(value);
}

export function shareSlugFromRequest(request: Request): ShareSlug | null {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const slug = path.startsWith("/") ? path.slice(1) : path;
  if (!isShareSlug(slug)) {
    return null;
  }
  return slug;
}

// Slack, X, LinkedIn, and iMessage GET the URL they unfurl. Inspect JSON has no og tags.
const SHARE_CRAWLER =
  /facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|Discordbot|TelegramBot|WhatsApp|Iframely|Embedly|Pinterest|redditbot|Applebot|Googlebot|bingbot|DuckDuckBot|SkypeUriPreview|Slack-ImgProxy|vkShare|Google-InspectionTool/i;

export function isShareCrawler(request: Request): boolean {
  return SHARE_CRAWLER.test(request.headers.get("user-agent") ?? "");
}

export function wantsSharePage(request: Request): boolean {
  if (request.method !== "GET") {
    return false;
  }
  const slug = shareSlugFromRequest(request);
  if (!slug) {
    return false;
  }
  if (isShareCrawler(request)) {
    return true;
  }
  const url = new URL(request.url);
  if (slug === "ask-jev") {
    return !url.searchParams.has("q") || !url.searchParams.has("t");
  }
  if (slug === "nice-try") {
    return !url.searchParams.has("p");
  }
  return true;
}

export function renderSharePage(slug: ShareSlug): string {
  const copy = SHARE_PAGES[slug];
  const canonical = `${SITE_ORIGIN}/${slug}`;
  const path = `/${slug}`;
  return renderNewsprintPage({
    canonical,
    title: copy.title,
    description: copy.description,
    ogTitle: copy.ogTitle,
    ogDescription: copy.ogDescription,
    ogImage: `${SITE_ORIGIN}/og/${slug}.png`,
    ogImageAlt: copy.ogImageAlt,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: copy.title,
      url: canonical,
      description: copy.description,
      isPartOf: {
        "@type": "WebApplication",
        name: "Safer with Jev",
        url: `${SITE_ORIGIN}/`,
      },
    },
    mainClass: "share",
    bodyHtml: `<h2>Safer with Jev</h2>
<h1>${escapeHtml(copy.cardLine1)}<br>${escapeHtml(copy.cardLine2)}</h1>
<p><code>${escapeHtml(path)}</code></p>
<p><a href="/">safer-with-jev.com</a></p>
`,
  });
}

export function sharePageForRequest(request: Request): Response | null {
  if (!wantsSharePage(request)) {
    return null;
  }
  const slug = shareSlugFromRequest(request);
  if (!slug) {
    return null;
  }
  return new Response(renderSharePage(slug), {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "cache-control": "public, max-age=120",
    },
  });
}
