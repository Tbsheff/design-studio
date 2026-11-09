import {
  applyVariable,
  holdsWhen,
  isFrameAction,
  isSwipeKind,
  linkAction,
} from "./deps.js";
import type {
  LinkAction,
  LinkBridgeTrigger,
  LinkTriggerKind,
  PlayRunOp,
  PrototypeLink,
  VariableMemory,
} from "./deps.js";

type PlayPhase = "start" | "end";

interface PlayHandlers {
  readonly close: () => boolean;
  readonly go: (link: PrototypeLink) => void;
  readonly open: (url: string) => void;
  readonly run: (op: PlayRunOp, selector: string) => void;
  readonly sync: () => void;
}

let playVars: VariableMemory = new Map();

const resetPlayVars = (): void => {
  playVars = new Map();
};

const readPlayVars = (): VariableMemory => playVars;

const isLinkOpen = (link: PrototypeLink): boolean =>
  holdsWhen(link.when ?? null, playVars);

const runVariable = (link: PrototypeLink, handlers: PlayHandlers): void => {
  if ("variable" in link.to) {
    playVars = applyVariable(playVars, link.to.variable);
    handlers.sync();
  }
};

const START_OPS = { hide: "hide", show: "show", toggle: "toggle" } as const;
const END_OPS = { hide: "show", show: "hide", toggle: "toggle" } as const;

const triggerKind = (link: PrototypeLink): LinkTriggerKind =>
  link.trigger?.kind ?? "click";

const selectorOp = (
  link: PrototypeLink,
  action: LinkAction,
  phase: PlayPhase
): PlayRunOp | null => {
  if (!("selector" in link.to)) {
    return null;
  }

  const visibility = link.to.visibility ?? "toggle";

  if (action === "toggle" && phase === "start") {
    return START_OPS[visibility];
  }

  if (action === "toggle") {
    return END_OPS[visibility];
  }

  if (action === "scroll-to" && phase === "start") {
    return "scroll";
  }

  return null;
};

const runSelector = (
  link: PrototypeLink,
  action: LinkAction,
  phase: PlayPhase,
  handlers: PlayHandlers
): void => {
  const op = selectorOp(link, action, phase);

  if (op !== null && "selector" in link.to) {
    handlers.run(op, link.to.selector);
  }
};

const endLink = (
  link: PrototypeLink,
  action: LinkAction,
  handlers: PlayHandlers
): void => {
  if (action === "modal" || action === "drawer") {
    handlers.close();

    return;
  }

  runSelector(link, action, "end", handlers);
};

const runLink = (
  link: PrototypeLink,
  phase: PlayPhase,
  handlers: PlayHandlers
): void => {
  const action = linkAction(link);

  if (phase === "end") {
    endLink(link, action, handlers);

    return;
  }

  if (!isLinkOpen(link)) {
    return;
  }

  if (action === "set-variable") {
    runVariable(link, handlers);

    return;
  }

  if (isFrameAction(action)) {
    handlers.go(link);

    return;
  }

  if (action === "close-overlay") {
    handlers.close();

    return;
  }

  if (action === "open-url" && "url" in link.to) {
    handlers.open(link.to.url);

    return;
  }

  runSelector(link, action, phase, handlers);
};

const keyOfEvent = (key: string): string => {
  if (key === " ") {
    return "Space";
  }

  return key;
};

const keyMatches = (link: PrototypeLink, raw: string): boolean => {
  if (link.trigger?.kind !== "key") {
    return false;
  }

  const key = keyOfEvent(raw);
  const want = link.trigger.key;

  if (want === key) {
    return true;
  }

  return want.length === 1 && want.toLowerCase() === key.toLowerCase();
};

const linksFrom = (
  links: readonly PrototypeLink[],
  frameId: string,
  kind: LinkTriggerKind
): PrototypeLink[] =>
  links.filter(
    (link) => link.from.frame === frameId && triggerKind(link) === kind
  );

const phaseOf = (raw: string): PlayPhase => {
  if (raw === "leave" || raw === "up") {
    return "end";
  }

  return "start";
};

const bridgeTrigger = (link: PrototypeLink): LinkBridgeTrigger | null => {
  const kind = triggerKind(link);

  if (kind === "hover" || kind === "press" || isSwipeKind(kind)) {
    return kind;
  }

  return null;
};

export {
  bridgeTrigger,
  keyMatches,
  linksFrom,
  phaseOf,
  readPlayVars,
  resetPlayVars,
  runLink,
  triggerKind,
};

export type { PlayHandlers, PlayPhase };
