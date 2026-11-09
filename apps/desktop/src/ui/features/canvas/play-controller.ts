import { BRIDGE_PASSIVE_PARAM } from "@design-studio/contracts";
import type { LinkRect, PlayKey, PlayRunOp } from "@design-studio/contracts";
import { targetFrame } from "@design-studio/contracts/link-interaction";
import { reverseTransition } from "@design-studio/contracts/link-labels";
import { isBackTarget, staticLinkIssue } from "@design-studio/contracts/links";
import type { LinkQuery, PrototypeLink } from "@design-studio/contracts/links";
import type { Dispatch, RefObject, SetStateAction } from "react";

import {
  bridgeTrigger,
  readPlayVars,
  resetPlayVars,
  runLink,
} from "../../canvas-link-slots.js";
import type { PlayHandlers } from "../../canvas-link-slots.js";
import { frameSrc, postToFrame } from "../../platform/bridge.js";
import type { BridgeFrame } from "../../platform/bridge.js";
import { randomToken } from "../../platform/session.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import {
  baseOf,
  INSTANT,
  LAYERS_FRESH_MS,
  motionOf,
  NO_BRIDGE_MS,
  overlayOf,
  placed,
  SETTLE_PAD_MS,
  settled,
  withPhase,
} from "./play-model.js";
import type {
  LayerShot,
  Motion,
  OverlayKind,
  PlayModeProps,
  Slot,
} from "./play-model.js";
import { playStartOf } from "./prototype-model.js";
import { linkQuery } from "./use-link-rects.js";

const MIN_BACK_HISTORY = 2;

const SMART_ANIMATE = "smart-animate";

type TimerId = ReturnType<typeof globalThis.setTimeout>;

interface PlayContext {
  readonly slots: RefObject<Slot[]>;
  readonly history: RefObject<string[]>;
  readonly props: RefObject<PlayModeProps>;
  readonly timers: RefObject<TimerId[]>;
  readonly shot: RefObject<LayerShot | null>;
  readonly pendingFx: RefObject<Map<string, Record<string, LinkRect>>>;
  readonly readyFrames: RefObject<Map<string, BridgeFrame>>;
  readonly setSlots: Dispatch<SetStateAction<Slot[]>>;
  readonly setHistory: (history: string[]) => void;
  readonly setError: (message: string | null) => void;
}

type Layers = Record<string, LinkRect>;

const scheduleLater = (ctx: PlayContext, fn: () => void, ms: number): void => {
  ctx.timers.current.push(globalThis.setTimeout(fn, ms));
};

const isShotFresh = (shot: LayerShot, top: Slot): boolean =>
  shot.token === top.token &&
  Date.now() - shot.at <= LAYERS_FRESH_MS &&
  Object.keys(shot.layers).length > 0;

const takeFreshLayers = (ctx: PlayContext): Layers | null => {
  const top = ctx.slots.current.at(-1);
  const last = ctx.shot.current;
  ctx.shot.current = null;

  if (last && top && isShotFresh(last, top)) {
    return last.layers;
  }

  return null;
};

const settleSlot = (ctx: PlayContext, token: string): void =>
  ctx.setSlots((prev) => settled(prev, token));

const revealSlot = (ctx: PlayContext, token: string): void => {
  const slot = ctx.slots.current.find((item) => item.token === token);

  if (!slot || slot.phase !== "loading") {
    return;
  }

  if (slot.transition === "instant" || slot.transition === SMART_ANIMATE) {
    settleSlot(ctx, token);

    return;
  }

  ctx.setSlots((prev) => withPhase(prev, token, "enter"));

  const onSecondFrame = (): void => {
    ctx.setSlots((prev) => withPhase(prev, token, "run"));
    scheduleLater(
      ctx,
      () => settleSlot(ctx, token),
      slot.duration + SETTLE_PAD_MS
    );
  };

  globalThis.requestAnimationFrame(() =>
    globalThis.requestAnimationFrame(onSecondFrame)
  );
};

const toEffectiveMotion = (motion: Motion, layers: Layers | null): Motion => {
  if (motion.transition === SMART_ANIMATE && !layers) {
    return { ...motion, transition: "dissolve" };
  }

  return motion;
};

const toSlotMotion = (ctx: PlayContext, effective: Motion): Motion => {
  if (ctx.slots.current.length === 0) {
    return INSTANT;
  }

  return effective;
};

const mountSlot = async (
  ctx: PlayContext,
  frame: CanvasFrame,
  motion: Motion,
  options: {
    layers: Layers | null;
    overlay: OverlayKind | null;
    after: () => void;
  }
): Promise<void> => {
  const url = await ctx.props.current.urlOf(frame);

  if (!url) {
    ctx.setError("The preview for that frame is not ready.");

    return;
  }

  const token = randomToken();

  if (options.layers) {
    ctx.pendingFx.current.set(token, options.layers);
  }

  const { duration, easing, transition } = toSlotMotion(ctx, motion);
  const { overlay } = options;
  const src = frameSrc(url, { [BRIDGE_PASSIVE_PARAM]: "1" });

  const key = token;
  const phase = "loading";

  const slot: Slot = {
    duration,
    easing,
    frame,
    key,
    overlay,
    phase,
    src,
    token,
    transition,
  };

  options.after();
  ctx.setSlots((prev) => placed(prev, slot));
  scheduleLater(ctx, () => revealSlot(ctx, token), NO_BRIDGE_MS);
};

const placeFrame = (
  ctx: PlayContext,
  frameId: string,
  motion: Motion,
  options: { overlay: OverlayKind | null; after: () => void }
): void => {
  const frame = ctx.props.current.frames.find((item) => item.id === frameId);

  if (!frame) {
    ctx.setError("That frame is gone.");

    return;
  }

  ctx.setError(null);

  let layers: Layers | null = null;

  if (motion.transition === SMART_ANIMATE) {
    layers = takeFreshLayers(ctx);
  }

  const effective = toEffectiveMotion(motion, layers);
  const { overlay, after } = options;
  void mountSlot(ctx, frame, effective, { after, layers, overlay });
};

const showFrame = (
  ctx: PlayContext,
  frameId: string,
  motion: Motion,
  nextHistory: string[]
): void =>
  placeFrame(ctx, frameId, motion, {
    after: () => ctx.setHistory(nextHistory),
    overlay: null,
  });

const closeOverlay = (ctx: PlayContext): boolean => {
  const open = overlayOf(ctx.slots.current);

  if (!open) {
    return false;
  }

  if (open.transition === "instant") {
    ctx.setSlots((prev) => prev.filter((item) => !item.overlay));

    return true;
  }

  ctx.setSlots((prev) => withPhase(prev, open.token, "closing"));
  scheduleLater(
    ctx,
    () =>
      ctx.setSlots((prev) => prev.filter((item) => item.token !== open.token)),
    open.duration + SETTLE_PAD_MS
  );

  return true;
};

const syncPlayVars = (ctx: PlayContext): void => {
  const vars = [...readPlayVars()];

  for (const frame of ctx.readyFrames.current.values()) {
    postToFrame(frame, { type: "play-vars", vars });
  }
};

const restartPlay = (ctx: PlayContext): void => {
  resetPlayVars();
  syncPlayVars(ctx);
  const { file, frames, startId } = ctx.props.current;
  const start = playStartOf(file, frames, startId);
  showFrame(ctx, start, { ...INSTANT, transition: "dissolve" }, [start]);
};

const toBackMotion = (current: Slot | undefined): Motion => {
  if (current) {
    return {
      duration: current.duration,
      easing: current.easing,
      transition: reverseTransition(current.transition),
    };
  }

  return INSTANT;
};

const goBack = (ctx: PlayContext): void => {
  if (closeOverlay(ctx)) {
    return;
  }

  const list = ctx.history.current;

  if (list.length < MIN_BACK_HISTORY) {
    return;
  }

  const previous = list[list.length - MIN_BACK_HISTORY] as string;

  const current = baseOf(ctx.slots.current).at(-1);
  showFrame(ctx, previous, toBackMotion(current), list.slice(0, -1));
};

const goLink = (ctx: PlayContext, link: PrototypeLink): void => {
  if (isBackTarget(link.to)) {
    goBack(ctx);

    return;
  }

  const to = targetFrame(link.to);

  if (to === null) {
    return;
  }

  if (link.action === "modal" || link.action === "drawer") {
    placeFrame(ctx, to, motionOf(link), {
      after: () => null,
      overlay: link.action,
    });

    return;
  }

  showFrame(ctx, to, motionOf(link), [...ctx.history.current, to]);
};

const runInTop = (ctx: PlayContext, op: PlayRunOp, selector: string): void => {
  const top = ctx.slots.current.at(-1);
  const frame = top && ctx.readyFrames.current.get(top.token);

  if (frame) {
    postToFrame(frame, { op, selector, type: "play-run" });
  }
};

const toHandlers = (ctx: PlayContext): PlayHandlers => ({
  close: () => closeOverlay(ctx),
  go: (link) => goLink(ctx, link),
  open: (url) => {
    globalThis.open(url, "_blank", "noopener,noreferrer");
  },
  run: (op, selector) => runInTop(ctx, op, selector),
  sync: () => syncPlayVars(ctx),
});

const clickLink = (ctx: PlayContext, id: string): void => {
  const link = ctx.props.current.file.links.find((item) => item.id === id);

  if (link) {
    runLink(link, "start", toHandlers(ctx));
  }
};

const handlePlayKey = (ctx: PlayContext, key: PlayKey): void => {
  if (key === "restart") {
    restartPlay(ctx);

    return;
  }

  if (key === "back") {
    goBack(ctx);

    return;
  }

  if (!closeOverlay(ctx)) {
    ctx.props.current.onClose();
  }
};

const isPlayable = (link: PrototypeLink, props: PlayModeProps): boolean =>
  (!link.trigger || bridgeTrigger(link) !== null) &&
  staticLinkIssue(link, props.frames) === null;

const isSetter = (link: PrototypeLink): boolean => "variable" in link.to;

const toPlayLink = (link: PrototypeLink): LinkQuery => {
  const query = linkQuery(link);
  const trigger = bridgeTrigger(link);

  if (trigger) {
    query.trigger = trigger;
  }

  return query;
};

const sendPlayLinks = (
  ctx: PlayContext,
  frame: BridgeFrame,
  slot: Slot
): void => {
  const props = ctx.props.current;
  const links: LinkQuery[] = [];

  const ordered = [
    ...props.file.links.filter((link) => isSetter(link)),
    ...props.file.links.filter((link) => !isSetter(link)),
  ];

  for (const link of ordered) {
    if (link.from.frame === slot.frame.id && isPlayable(link, props)) {
      links.push(toPlayLink(link));
    }
  }

  postToFrame(frame, { type: "play-vars", vars: [...readPlayVars()] });
  postToFrame(frame, { links, type: "play-links" });
};

const resendPlayLinks = (ctx: PlayContext): void => {
  const ready = ctx.readyFrames.current;

  for (const token of ready.keys()) {
    if (!ctx.slots.current.some((slot) => slot.token === token)) {
      ready.delete(token);
    }
  }

  for (const slot of ctx.slots.current) {
    const frame = ready.get(slot.token);

    if (frame) {
      sendPlayLinks(ctx, frame, slot);
    }
  }
};

const markReady = (ctx: PlayContext, frame: BridgeFrame, slot: Slot): void => {
  ctx.readyFrames.current.set(slot.token, frame);
  sendPlayLinks(ctx, frame, slot);
  const layers = ctx.pendingFx.current.get(slot.token);

  if (layers) {
    ctx.pendingFx.current.delete(slot.token);
    const { duration, easing } = slot;
    postToFrame(frame, { duration, easing, layers, type: "play-fx" });
  }

  revealSlot(ctx, slot.token);
};

export {
  clickLink,
  closeOverlay,
  goBack,
  handlePlayKey,
  markReady,
  resendPlayLinks,
  restartPlay,
  toHandlers,
};

export type { PlayContext };
