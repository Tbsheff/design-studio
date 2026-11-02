import type { LinkTarget } from "./links.js";

const LINK_EXTRA_ACTIONS = [
  "scroll-to",
  "open-url",
  "close-overlay",
  "toggle",
] as const;

const LINK_TRIGGERS = ["click", "hover", "press", "delay", "key"] as const;
const LINK_VISIBILITIES = ["toggle", "show", "hide"] as const;
const LINK_DELAY_MAX = 60_000;
const LINK_URL_MAX = 2000;
const LINK_KEY_RE = /^(?:[!-~]|[A-Z][A-Za-z0-9]{1,19})$/u;

type LinkTriggerKind = (typeof LINK_TRIGGERS)[number];

type LinkVisibility = (typeof LINK_VISIBILITIES)[number];

type LinkTrigger =
  | { readonly kind: "hover" }
  | { readonly kind: "press" }
  | { readonly kind: "delay"; readonly ms: number }
  | { readonly kind: "key"; readonly key: string };

type TriggerFields =
  | { readonly trigger: "hover" | "press" }
  | { readonly delayMs: number; readonly trigger: "delay" }
  | { readonly key: string; readonly trigger: "key" }
  | Readonly<Record<string, never>>;

type TargetFields =
  | { readonly toFrame: string }
  | { readonly target: string; readonly visibility: LinkVisibility }
  | { readonly target: string }
  | { readonly url: string }
  | Readonly<Record<string, never>>;

const TRIGGER_LABELS = {
  click: "On click",
  delay: "After delay",
  hover: "On hover",
  key: "On key",
  press: "While pressing",
} satisfies Record<LinkTriggerKind, string>;

const urlOf = (text: string): URL | null => {
  if (!URL.canParse(text)) {
    return null;
  }

  return new URL(text);
};

const cleanLinkUrl = (raw: string): string | null => {
  if (raw.length > LINK_URL_MAX) {
    return null;
  }

  const url = urlOf(raw.trim());

  if (url?.protocol !== "https:") {
    return null;
  }

  return url.href;
};

const cleanLinkKey = (raw: string): string | null => {
  if (raw === " ") {
    return "Space";
  }

  const key = raw.trim();

  if (!LINK_KEY_RE.test(key)) {
    return null;
  }

  return key;
};

const cleanDelay = (raw: number): number | null => {
  if (!Number.isFinite(raw)) {
    return null;
  }

  return Math.round(Math.max(0, Math.min(LINK_DELAY_MAX, raw)));
};

const triggerOf = (
  kind: string,
  ms: number | null,
  key: string | null
): LinkTrigger | null => {
  if (kind === "hover" || kind === "press") {
    return { kind };
  }

  if (kind === "delay" && ms !== null) {
    const delay = cleanDelay(ms);

    if (delay !== null) {
      return { kind, ms: delay };
    }
  }

  if (kind === "key" && key !== null) {
    const name = cleanLinkKey(key);

    if (name !== null) {
      return { key: name, kind };
    }
  }

  return null;
};

const triggerSuffix = (trigger: LinkTrigger | null): string => {
  if (!trigger) {
    return "";
  }

  if (trigger.kind === "key") {
    return `\u0000key\u0000${trigger.key}`;
  }

  return `\u0000${trigger.kind}`;
};

const targetFrame = (target: LinkTarget): string | null => {
  if ("frame" in target) {
    return target.frame;
  }

  return null;
};

const targetRef = (target: LinkTarget): string => {
  if ("frame" in target) {
    return target.frame;
  }

  if ("selector" in target) {
    return `selector:${target.selector}`;
  }

  if ("url" in target) {
    return `url:${target.url}`;
  }

  if ("close" in target) {
    return "close";
  }

  return "back";
};

const targetFits = (action: string, target: LinkTarget): boolean => {
  if (action === "scroll-to" || action === "toggle") {
    return "selector" in target;
  }

  if (action === "open-url") {
    return "url" in target;
  }

  if (action === "close-overlay") {
    return "close" in target;
  }

  if (action === "navigate") {
    return "frame" in target || "back" in target;
  }

  return "frame" in target;
};

const selectorFields = (
  target: { readonly selector: string; readonly visibility?: LinkVisibility },
  action: string
): TargetFields => {
  if (action !== "toggle") {
    return { target: target.selector };
  }

  return {
    target: target.selector,
    visibility: target.visibility ?? "toggle",
  };
};

const describeTarget = (target: LinkTarget, action: string): TargetFields => {
  if ("frame" in target) {
    return { toFrame: target.frame };
  }

  if ("back" in target) {
    return { toFrame: "back" };
  }

  if ("url" in target) {
    return { url: target.url };
  }

  if ("selector" in target) {
    return selectorFields(target, action);
  }

  return {};
};

const describeTrigger = (trigger: LinkTrigger | null): TriggerFields => {
  if (!trigger) {
    return {};
  }

  if (trigger.kind === "delay") {
    return { delayMs: trigger.ms, trigger: "delay" };
  }

  if (trigger.kind === "key") {
    return { key: trigger.key, trigger: "key" };
  }

  return { trigger: trigger.kind };
};

export {
  LINK_DELAY_MAX,
  LINK_EXTRA_ACTIONS,
  LINK_KEY_RE,
  LINK_TRIGGERS,
  LINK_URL_MAX,
  LINK_VISIBILITIES,
  TRIGGER_LABELS,
  cleanDelay,
  cleanLinkKey,
  cleanLinkUrl,
  describeTarget,
  describeTrigger,
  targetFits,
  targetFrame,
  targetRef,
  triggerOf,
  triggerSuffix,
};

export type { LinkTrigger, LinkTriggerKind, LinkVisibility };
