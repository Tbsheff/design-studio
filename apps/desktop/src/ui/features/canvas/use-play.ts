import type { BridgeToParent } from "@design-studio/contracts";
import type { LinkRectReport } from "@design-studio/contracts/links";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { RefObject } from "react";

import { usePlayTriggers } from "../../canvas-link-slots.js";
import type { PlayHandlers } from "../../canvas-link-slots.js";
import { useBridge } from "../../platform/bridge.js";
import type { BridgeFrame } from "../../platform/bridge.js";
import {
  clickLink,
  closeOverlay as closePlayOverlay,
  goBack,
  handlePlayKey,
  markReady,
  resendPlayLinks,
  restartPlay,
  toHandlers,
} from "./play-controller.js";
import type { PlayContext } from "./play-controller.js";
import { keyOf } from "./play-model.js";
import type { LayerShot, PlayModeProps, Slot } from "./play-model.js";

type Triggers = ReturnType<typeof usePlayTriggers>;

interface PlayState {
  readonly back: () => void;
  readonly closeOverlay: () => boolean;
  readonly elements: RefObject<Record<string, HTMLIFrameElement | null>>;
  readonly error: string | null;
  readonly history: string[];
  readonly restart: () => void;
  readonly slots: Slot[];
}

const toLinkKey = (props: PlayModeProps): string =>
  props.file.links
    .map(
      (link) =>
        `${link.id}:${link.from.frame}:${link.from.selector}:${link.trigger?.kind ?? ""}`
    )
    .join("|");

const usePlayContext = (
  currentProps: PlayModeProps,
  currentSlots: Slot[],
  currentHistory: string[],
  deps: Pick<
    PlayContext,
    "elements" | "setError" | "setHistory" | "setSlots" | "stage"
  >
): PlayContext => {
  const slotsRef = useRef(currentSlots);
  const historyRef = useRef(currentHistory);
  const propsRef = useRef(currentProps);
  const timers = useRef<PlayContext["timers"]["current"]>([]);
  const shot = useRef<LayerShot | null>(null);
  const pendingFx = useRef<PlayContext["pendingFx"]["current"]>(new Map());
  const readyFrames = useRef<PlayContext["readyFrames"]["current"]>(new Map());
  const rects = useRef<PlayContext["rects"]["current"]>(new Map());
  const { elements, setError, setHistory, setSlots, stage } = deps;

  useLayoutEffect(() => {
    slotsRef.current = currentSlots;
    historyRef.current = currentHistory;
    propsRef.current = currentProps;
  });

  const history = historyRef;
  const props = propsRef;
  const slots = slotsRef;

  return useMemo(
    () => ({
      elements,
      history,
      pendingFx,
      props,
      readyFrames,
      rects,
      setError,
      setHistory,
      setSlots,
      shot,
      slots,
      stage,
      timers,
    }),
    [elements, history, props, slots, stage, setError, setHistory, setSlots]
  );
};

const usePlayEffects = (ctx: PlayContext, linkKey: string): void => {
  useEffect(() => {
    restartPlay(ctx);
    const list = ctx.timers.current;

    return (): void => {
      for (const timer of list) {
        globalThis.clearTimeout(timer);
      }
    };
  }, [ctx]);

  useEffect(() => {
    const handler = (event: KeyboardEvent): void => {
      const key = keyOf(event);

      if (event.metaKey || event.ctrlKey || event.altKey || !key) {
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      handlePlayKey(ctx, key);
    };

    globalThis.addEventListener("keydown", handler, true);

    return (): void => globalThis.removeEventListener("keydown", handler, true);
  }, [ctx]);

  const lastKey = useRef(linkKey);

  useEffect(() => {
    if (lastKey.current !== linkKey) {
      lastKey.current = linkKey;
      resendPlayLinks(ctx);
    }
  }, [ctx, linkKey]);
};

const handleTopMessage = (
  ctx: PlayContext,
  triggers: Triggers,
  slot: Slot,
  message: BridgeToParent
): void => {
  switch (message.type) {
    case "play-layers": {
      ctx.shot.current = {
        at: Date.now(),
        layers: message.layers,
        token: slot.token,
      };
      break;
    }

    case "play-click": {
      clickLink(ctx, message.id);
      break;
    }

    case "play-trigger": {
      triggers.onTrigger(message.id, message.phase);
      break;
    }

    case "play-press-key": {
      triggers.onKey(message.key);
      break;
    }

    default: {
      break;
    }
  }
};

const keepRects = (
  ctx: PlayContext,
  slot: Slot,
  links: LinkRectReport[]
): void => {
  const byId = new Map<string, LinkRectReport["rect"]>();

  for (const report of links) {
    byId.set(report.id, report.rect);
  }

  ctx.rects.current.set(slot.token, byId);
};

const handleBridgeMessage = (
  ctx: PlayContext,
  triggers: Triggers,
  frame: BridgeFrame,
  message: BridgeToParent
): void => {
  const slot = ctx.slots.current.find((item) => item.token === frame.token);

  if (!slot) {
    return;
  }

  if (message.type === "ready") {
    markReady(ctx, frame, slot);

    return;
  }

  if (message.type === "link-rects") {
    keepRects(ctx, slot, message.links);

    return;
  }

  if (message.type === "play-key") {
    handlePlayKey(ctx, message.key);

    return;
  }

  if (slot === ctx.slots.current.at(-1)) {
    handleTopMessage(ctx, triggers, slot, message);
  }
};

const toBridgeFrames = (
  ctx: PlayContext,
  elements: PlayState["elements"]
): BridgeFrame[] =>
  ctx.slots.current.map((slot) => ({
    element: elements.current[slot.token] ?? null,
    key: slot.token,
    kind: ctx.props.current.kind,
    token: slot.token,
    url: slot.src,
  }));

const usePlay = (
  props: PlayModeProps,
  stage: RefObject<HTMLElement | null>
): PlayState => {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const elements = useRef<Record<string, HTMLIFrameElement | null>>({});

  const ctx = usePlayContext(props, slots, history, {
    elements,
    setError,
    setHistory,
    setSlots,
    stage,
  });

  const handlers: PlayHandlers = toHandlers(ctx);
  const topSlot = slots.at(-1);

  const frameId = topSlot?.frame.id ?? null;
  const token = topSlot?.token ?? null;
  const { links } = props.file;
  const triggers = usePlayTriggers({ frameId, handlers, links, token });

  usePlayEffects(ctx, toLinkKey(props));

  useBridge(
    () => toBridgeFrames(ctx, elements),
    (frame, message: BridgeToParent) =>
      handleBridgeMessage(ctx, triggers, frame, message)
  );

  const back = (): void => goBack(ctx);
  const restart = (): void => restartPlay(ctx);
  const closeOverlay = (): boolean => closePlayOverlay(ctx);

  return {
    back,
    closeOverlay,
    elements,
    error,
    history,
    restart,
    slots,
  };
};

export { usePlay };

export type { PlayState };
