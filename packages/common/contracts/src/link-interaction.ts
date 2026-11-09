import type {
  LinkVariableOp,
  LinkVariableValue,
  LinkWhen,
} from "@design-studio/contracts/link-variable";
import type { LinkTarget, PrototypeLink } from "@design-studio/contracts/links";

const LINK_EXTRA_ACTIONS = [
  "scroll-to",
  "open-url",
  "close-overlay",
  "toggle",
  "set-variable",
] as const;

const LINK_TRIGGERS = [
  "click",
  "hover",
  "press",
  "delay",
  "key",
  "swipe-left",
  "swipe-right",
  "swipe-up",
  "swipe-down",
] as const;

const LINK_SWIPE_TRIGGERS = [
  "swipe-left",
  "swipe-right",
  "swipe-up",
  "swipe-down",
] as const;

const LINK_VISIBILITIES = ["toggle", "show", "hide"] as const;

const LINK_PLACEMENTS = [
  "bottom-start",
  "bottom-end",
  "top-start",
  "top-end",
  "right",
  "left",
] as const;

const LINK_PLACEMENT_DEFAULT = "bottom-start";
const LINK_DELAY_MAX = 60_000;
const LINK_URL_MAX = 2000;
const LINK_KEY_RE = /^(?:[!-~]|[A-Z][A-Za-z0-9]{1,19})$/u;

type LinkTriggerKind = (typeof LINK_TRIGGERS)[number];

type LinkBridgeTrigger = Exclude<LinkTriggerKind, "click" | "delay" | "key">;

type LinkSwipeKind = (typeof LINK_SWIPE_TRIGGERS)[number];

type LinkVisibility = (typeof LINK_VISIBILITIES)[number];

type LinkPlacement = (typeof LINK_PLACEMENTS)[number];

interface LinkPopoverFields {
  placement?: LinkPlacement;
  isOutsideClose?: false;
}

interface LinkPopoverMotion {
  placement?: LinkPlacement;
  isOutsideClose?: boolean;
}

type LinkTrigger =
  | { readonly kind: "hover" }
  | { readonly kind: "press" }
  | { readonly kind: LinkSwipeKind }
  | { readonly kind: "delay"; readonly ms: number }
  | { readonly kind: "key"; readonly key: string };

type TriggerFields =
  | { readonly when: LinkWhen }
  | { readonly trigger: "hover" | "press" | LinkSwipeKind }
  | { readonly delayMs: number; readonly trigger: "delay" }
  | { readonly key: string; readonly trigger: "key" }
  | Readonly<Record<string, never>>;

type TargetFields =
  | { readonly toFrame: string }
  | { readonly target: string; readonly visibility: LinkVisibility }
  | { readonly target: string }
  | { readonly url: string }
  | {
      readonly variable: string;
      readonly variableOp: LinkVariableOp;
      readonly variableValue: LinkVariableValue | null;
    }
  | Readonly<Record<string, never>>;

const TRIGGER_LABELS = {
  click: "On click",
  delay: "After delay",
  hover: "On hover",
  key: "On key",
  press: "While pressing",
  "swipe-down": "On swipe down",
  "swipe-left": "On swipe left",
  "swipe-right": "On swipe right",
  "swipe-up": "On swipe up",
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

const isLinkPlacement = (value: unknown): value is LinkPlacement =>
  typeof value === "string" &&
  (LINK_PLACEMENTS as readonly string[]).includes(value);

const popoverMotionOf = (raw: {
  readonly isOutsideClose?: unknown;
  readonly placement?: unknown;
}): LinkPopoverMotion => {
  const motion: LinkPopoverMotion = {};

  if (isLinkPlacement(raw.placement)) {
    motion.placement = raw.placement;
  }

  if (raw.isOutsideClose === false) {
    motion.isOutsideClose = false;
  }

  return motion;
};

const withPopover = <Link extends LinkPopoverFields & { action?: string }>(
  link: Link,
  motion: LinkPopoverMotion
): Link => {
  const out: Link = { ...link };

  if (out.action !== "popover") {
    delete out.placement;
    delete out.isOutsideClose;

    return out;
  }

  out.placement = motion.placement ?? out.placement ?? LINK_PLACEMENT_DEFAULT;

  if (motion.isOutsideClose === false) {
    out.isOutsideClose = false;
  }

  if (motion.isOutsideClose === true) {
    delete out.isOutsideClose;
  }

  return out;
};

const isSwipeKind = (kind: string): kind is LinkSwipeKind =>
  (LINK_SWIPE_TRIGGERS as readonly string[]).includes(kind);

const triggerOf = (
  kind: string,
  ms: number | null,
  key: string | null
): LinkTrigger | null => {
  if (kind === "hover" || kind === "press" || isSwipeKind(kind)) {
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

  if ("variable" in target) {
    return `variable:${target.variable.name}`;
  }

  return "back";
};

const targetFits = (action: string, target: LinkTarget): boolean => {
  if (action === "set-variable") {
    return "variable" in target;
  }

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

  if ("variable" in target) {
    return {
      variable: target.variable.name,
      variableOp: target.variable.op,
      variableValue: target.variable.value,
    };
  }

  if ("selector" in target) {
    return selectorFields(target, action);
  }

  return {};
};

interface MotionFields {
  easing?: NonNullable<PrototypeLink["easing"]>;
  isOutsideClose?: false;
  placement?: LinkPlacement;
}

const describeMotion = (
  link: Pick<PrototypeLink, "easing" | "isOutsideClose" | "placement">
): MotionFields => {
  const fields: MotionFields = {};

  if (link.easing) {
    fields.easing = link.easing;
  }

  if (link.placement) {
    fields.placement = link.placement;
  }

  if (link.isOutsideClose === false) {
    fields.isOutsideClose = false;
  }

  return fields;
};

const describeTrigger = (
  trigger: LinkTrigger | null,
  when: LinkWhen | null
): TriggerFields => {
  if (when) {
    return { ...describeTrigger(trigger, null), when };
  }

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
  LINK_PLACEMENT_DEFAULT,
  LINK_PLACEMENTS,
  LINK_SWIPE_TRIGGERS,
  LINK_TRIGGERS,
  LINK_URL_MAX,
  LINK_VISIBILITIES,
  TRIGGER_LABELS,
  cleanDelay,
  cleanLinkKey,
  cleanLinkUrl,
  describeMotion,
  describeTarget,
  describeTrigger,
  isLinkPlacement,
  isSwipeKind,
  popoverMotionOf,
  targetFits,
  targetFrame,
  targetRef,
  triggerOf,
  triggerSuffix,
  withPopover,
};

export type {
  LinkBridgeTrigger,
  LinkPlacement,
  LinkPopoverFields,
  LinkPopoverMotion,
  LinkSwipeKind,
  LinkTrigger,
  LinkTriggerKind,
  LinkVisibility,
};
