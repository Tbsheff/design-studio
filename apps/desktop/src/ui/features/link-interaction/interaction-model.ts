import { OUTSIDE_CLOSE_LABELS, VISIBILITY_LABELS } from "./copy.js";
import {
  ACTION_LABELS,
  LINK_INTERACTION_ACTIONS,
  LINK_PLACEMENTS,
  LINK_TRIGGERS,
  LINK_VISIBILITIES,
  PLACEMENT_LABELS,
  TRIGGER_LABELS,
  cleanLinkKey,
  isFrameAction,
  linkAction,
  targetFrame,
} from "./deps.js";
import type {
  CanvasFrame,
  LinkAction,
  LinkInteractionChange,
  LinkPlacement,
  LinkTarget,
  LinkTriggerKind,
  LinkVisibility,
  PrototypeLink,
  UiSelectOption,
} from "./deps.js";

type PendingKind = "pick" | "url" | "key" | "variable" | null;

interface Pending {
  readonly action: LinkAction | null;
  readonly kind: PendingKind;
}

const DELAY_DEFAULT = 1000;
const NO_PENDING: Pending = { action: null, kind: null };

const triggerOptions: UiSelectOption<LinkTriggerKind>[] = LINK_TRIGGERS.map(
  (trigger) => ({ label: TRIGGER_LABELS[trigger], value: trigger })
);

const actionOptions: UiSelectOption<LinkAction>[] =
  LINK_INTERACTION_ACTIONS.map((action) => ({
    label: ACTION_LABELS[action],
    value: action,
  }));

const visibilityOptions: UiSelectOption<LinkVisibility>[] =
  LINK_VISIBILITIES.map((visibility) => ({
    label: VISIBILITY_LABELS[visibility],
    value: visibility,
  }));

const placementOptions: UiSelectOption<LinkPlacement>[] = LINK_PLACEMENTS.map(
  (placement) => ({
    label: PLACEMENT_LABELS[placement],
    value: placement,
  })
);

type OutsideCloseValue = keyof typeof OUTSIDE_CLOSE_LABELS;

const outsideCloseOptions: UiSelectOption<OutsideCloseValue>[] = [
  { label: OUTSIDE_CLOSE_LABELS.close, value: "close" },
  { label: OUTSIDE_CLOSE_LABELS.stay, value: "stay" },
];

const placementOf = (link: PrototypeLink): LinkPlacement =>
  link.placement ?? "bottom-start";

const outsideCloseOf = (link: PrototypeLink): OutsideCloseValue => {
  if (link.isOutsideClose === false) {
    return "stay";
  }

  return "close";
};

const triggerOf = (link: PrototypeLink): LinkTriggerKind =>
  link.trigger?.kind ?? "click";

const delayOf = (link: PrototypeLink): number => {
  if (link.trigger?.kind === "delay") {
    return link.trigger.ms;
  }

  return DELAY_DEFAULT;
};

const keyOf = (link: PrototypeLink): string | null => {
  if (link.trigger?.kind === "key") {
    return link.trigger.key;
  }

  return null;
};

const selectorOf = (to: LinkTarget): string | null => {
  if ("selector" in to) {
    return to.selector;
  }

  return null;
};

const urlOf = (to: LinkTarget): string | null => {
  if ("url" in to) {
    return to.url;
  }

  return null;
};

const visibilityOf = (to: LinkTarget): LinkVisibility => {
  if ("selector" in to && to.visibility) {
    return to.visibility;
  }

  return "toggle";
};

const firstOther = (
  link: PrototypeLink,
  frames: readonly CanvasFrame[]
): string | null =>
  frames.find((frame) => frame.id !== link.from.frame)?.id ?? null;

const needsFrame = (link: PrototypeLink, action: LinkAction): boolean => {
  if (targetFrame(link.to) !== null) {
    return false;
  }

  return action !== "navigate" || !("back" in link.to);
};

const frameChange = (
  link: PrototypeLink,
  action: LinkAction,
  frames: readonly CanvasFrame[]
): LinkInteractionChange | null => {
  if (!needsFrame(link, action)) {
    return { action, linkId: link.id };
  }

  const toFrame = firstOther(link, frames);
  const linkId = link.id;

  if (toFrame === null) {
    return null;
  }

  return { action, linkId, toFrame };
};

const pendingFor = (link: PrototypeLink, action: LinkAction): Pending => {
  if (action === "open-url" && urlOf(link.to) === null) {
    return { action, kind: "url" };
  }

  if (action === "set-variable" && !("variable" in link.to)) {
    return { action, kind: "variable" };
  }

  const wantsSelector = action === "scroll-to" || action === "toggle";

  if (wantsSelector && selectorOf(link.to) === null) {
    return { action, kind: "pick" };
  }

  return NO_PENDING;
};

const actionChange = (
  link: PrototypeLink,
  action: LinkAction,
  frames: readonly CanvasFrame[]
): LinkInteractionChange | null => {
  if (isFrameAction(action)) {
    return frameChange(link, action, frames);
  }

  if (pendingFor(link, action).kind !== null) {
    return null;
  }

  return { action, linkId: link.id };
};

const triggerChange = (
  link: PrototypeLink,
  trigger: LinkTriggerKind
): LinkInteractionChange | null => {
  if (trigger === "delay") {
    return { delayMs: delayOf(link), linkId: link.id, trigger };
  }

  if (trigger === "key") {
    return null;
  }

  return { linkId: link.id, trigger };
};

const keyName = (event: KeyboardEvent): string | null => {
  if (event.key === " ") {
    return "Space";
  }

  return cleanLinkKey(event.key);
};

const shownAction = (link: PrototypeLink, pending: Pending): LinkAction =>
  pending.action ?? linkAction(link);

export {
  DELAY_DEFAULT,
  NO_PENDING,
  actionChange,
  actionOptions,
  delayOf,
  keyName,
  keyOf,
  outsideCloseOf,
  outsideCloseOptions,
  pendingFor,
  placementOf,
  placementOptions,
  selectorOf,
  shownAction,
  triggerChange,
  triggerOf,
  triggerOptions,
  urlOf,
  visibilityOf,
  visibilityOptions,
};

export type { OutsideCloseValue, Pending, PendingKind };
