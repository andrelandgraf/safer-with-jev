export const SITE_ORIGIN = "https://safer-with-jev.com";

export const SITE_META = {
  title: "Safer with Jev",
  description:
    "Inspect prompts, images, and replies with TypeSafe Jev. JSON API at api.safer-with-jev.com.",
  ogTitle: "Safer with Jev",
  ogDescription: "Route through Jev. Rather safe than sorry.",
  ogImageAlt:
    'Gray newsprint card with "Safer with Jev" above large serif text reading "Route through Jev. Rather safe than sorry."',
} as const;

export const SHARE_SLUGS = [
  "ask-jev",
  "nice-try",
  "block-prompt-injections",
  "block-unsafe-images",
  "block-unsafe-replies",
] as const;

export type ShareSlug = (typeof SHARE_SLUGS)[number];

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
  "block-unsafe-images": {
    title: "Block unsafe images",
    description: "Check images for unsafe content with Jev.",
    ogTitle: "Block unsafe images",
    ogDescription: "Check images for unsafe content with Jev.",
    ogImageAlt: "Safer with Jev. Check the image. Before it goes through.",
    cardLine1: "Check the image.",
    cardLine2: "Before it goes through.",
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
} as const satisfies Record<
  ShareSlug,
  {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
    ogImageAlt: string;
    cardLine1: string;
    cardLine2: string;
  }
>;

export function isShareSlug(value: string): value is ShareSlug {
  return (SHARE_SLUGS as readonly string[]).includes(value);
}
