import type { BridgeToParent, ProjectKind } from "@design-studio/contracts";
import { useEffect, useSyncExternalStore } from "react";
import type { MutableRefObject } from "react";

import { postToFrame, useBridge } from "../../platform/bridge.js";
import type { BridgeFrame, ParentMessageBody } from "../../platform/bridge.js";

type ThemeChoice = "light" | "dark" | null;

interface FrameSlot {
  token: string;
  src: string;
}

type FrameSource = () => BridgeFrame;

const sources = new Map<string, FrameSource>();
const liveTokens = new Set<string>();
const HOLD_FALLBACK_MS = 4000;
const NO_CSS = "";
const SHARE_POINTER = "share-pointer";

interface HoldState {
  timer: ReturnType<typeof globalThis.setTimeout> | null;
  expired: boolean;
  fresh: Set<string>;
  painted: Set<string>;
}

type CssMessage = "tokens-preview" | "tweaks-preview";

interface CssChannel {
  type: CssMessage;
  css: string;
  hold: HoldState;
}

const createChannel = (type: CssMessage): CssChannel => ({
  css: NO_CSS,
  hold: { expired: false, fresh: new Set(), painted: new Set(), timer: null },
  type,
});

const tokenChannel = createChannel("tokens-preview");
const tweakChannel = createChannel("tweaks-preview");
const channels = [tokenChannel, tweakChannel];

interface CurrentState {
  pointer: boolean;
  theme: ThemeChoice;
}

const current: CurrentState = {
  pointer: false,
  theme: null,
};

type SharePointerMessage = Extract<BridgeToParent, { type: "share-pointer" }>;

const pointerListeners = new Set<
  (frame: BridgeFrame, message: SharePointerMessage) => void
>();

interface CanvasState {
  front: string | null;
  swapping: boolean;
}

const canvas: CanvasState = {
  front: null,
  swapping: false,
};

const holding = (channel: CssChannel): boolean =>
  channel.hold.timer !== null || channel.hold.expired;

const endHold = (channel: CssChannel): void => {
  const { hold } = channel;

  if (hold.timer !== null) {
    globalThis.clearTimeout(hold.timer);
  }

  hold.timer = null;
  hold.expired = false;
  hold.fresh.clear();
  hold.painted.clear();
};

const tokenFrames = (): BridgeFrame[] =>
  [...sources.values()].flatMap((source) => {
    const frame = source();

    if (frame.element === null) {
      return [];
    }

    return [frame];
  });

const broadcastCss = (channel: CssChannel, css: string): void => {
  endHold(channel);

  if (css === channel.css) {
    return;
  }

  channel.css = css;

  for (const frame of tokenFrames()) {
    postToFrame(frame, { css, type: channel.type });
  }
};

const releaseHold = (channel: CssChannel): void => {
  if (!holding(channel)) {
    return;
  }

  const { front } = canvas;
  const freshFront = front !== null && channel.hold.painted.has(front);

  if (freshFront || (channel.hold.expired && !canvas.swapping)) {
    broadcastCss(channel, NO_CSS);
  }
};

const expireHold = (channel: CssChannel): void => {
  channel.hold.timer = null;
  channel.hold.expired = true;
  releaseHold(channel);
};

const registerTokenFrame = (
  token: string,
  source: FrameSource,
  live: boolean
): (() => void) => {
  sources.set(token, source);

  if (live) {
    liveTokens.add(token);
  } else {
    liveTokens.delete(token);
  }

  return () => {
    if (sources.get(token) !== source) {
      return;
    }

    sources.delete(token);
    liveTokens.delete(token);
  };
};

const postToLiveFrames = (body: ParentMessageBody): void => {
  for (const token of liveTokens) {
    const frame = sources.get(token)?.();

    if (frame?.element) {
      postToFrame(frame, body);
    }
  }
};

const holdUntilReload = (channel: CssChannel): void => {
  endHold(channel);

  if (channel.css === NO_CSS) {
    return;
  }

  channel.hold.timer = globalThis.setTimeout(
    () => expireHold(channel),
    HOLD_FALLBACK_MS
  );
};

const broadcastTokenCss = (css: string): void => {
  broadcastCss(tokenChannel, css);
};

const broadcastTweakCss = (css: string): void => {
  broadcastCss(tweakChannel, css);
};

const holdTokenCssUntilReload = (): void => {
  holdUntilReload(tokenChannel);
};

const holdTweakCssUntilReload = (): void => {
  holdUntilReload(tweakChannel);
};

const themeListeners = new Set<() => void>();

const subscribeTheme = (listener: () => void): (() => void) => {
  themeListeners.add(listener);

  return () => themeListeners.delete(listener);
};

const broadcastTheme = (theme: ThemeChoice): void => {
  const changed = current.theme !== theme;
  current.theme = theme;

  for (const frame of tokenFrames()) {
    postToFrame(frame, { theme, type: "set-theme" });
  }

  if (changed) {
    for (const listener of themeListeners) {
      listener();
    }
  }
};

const useCanvasTheme = (): ThemeChoice =>
  useSyncExternalStore(subscribeTheme, () => current.theme);

const setSharePointer = (on: boolean): void => {
  if (current.pointer === on) {
    return;
  }

  current.pointer = on;

  for (const frame of tokenFrames()) {
    postToFrame(frame, { on, type: SHARE_POINTER });
  }
};

const onSharePointer = (
  listener: (frame: BridgeFrame, message: SharePointerMessage) => void
): (() => void) => {
  pointerListeners.add(listener);

  return () => pointerListeners.delete(listener);
};

const syncChannel = (frame: BridgeFrame, channel: CssChannel): void => {
  if (holding(channel)) {
    channel.hold.fresh.add(frame.token);

    return;
  }

  if (channel.css !== NO_CSS) {
    postToFrame(frame, { css: channel.css, type: channel.type });
  }
};

const syncTokenFrame = (frame: BridgeFrame): void => {
  for (const channel of channels) {
    syncChannel(frame, channel);
  }

  if (current.theme !== null) {
    postToFrame(frame, { theme: current.theme, type: "set-theme" });
  }

  if (current.pointer) {
    postToFrame(frame, { on: true, type: SHARE_POINTER });
  }
};

const onTokenFrameMessage = (
  frame: BridgeFrame,
  message: BridgeToParent
): void => {
  if (message.type === "ready") {
    syncTokenFrame(frame);

    return;
  }

  if (message.type === SHARE_POINTER) {
    for (const listener of pointerListeners) {
      listener(frame, message);
    }

    return;
  }

  if (message.type !== "painted") {
    return;
  }

  const waiting = channels.filter((channel) =>
    channel.hold.fresh.has(frame.token)
  );

  for (const channel of waiting) {
    channel.hold.painted.add(frame.token);
    releaseHold(channel);
  }
};

const setCanvasFront = (front: string | null, swapping: boolean): void => {
  canvas.front = front;
  canvas.swapping = swapping;

  for (const channel of channels) {
    releaseHold(channel);
  }
};

const useTokenFrameSync = (): void => {
  useBridge(tokenFrames, onTokenFrameMessage);
  useEffect(
    () => (): void => {
      for (const channel of channels) {
        endHold(channel);
        channel.css = NO_CSS;
      }

      broadcastTheme(null);
    },
    []
  );
};

const useTokenFrames = (
  slots: FrameSlot[],
  elements: MutableRefObject<Record<string, HTMLIFrameElement | null>>,
  frameKind: ProjectKind,
  live = false
): void => {
  useEffect(() => {
    const offs = slots.map((slot) =>
      registerTokenFrame(
        slot.token,
        () => ({
          element: elements.current[slot.token] ?? null,
          key: slot.token,
          kind: frameKind,
          token: slot.token,
          url: slot.src,
        }),
        live
      )
    );

    return (): void => {
      for (const off of offs) {
        off();
      }
    };
  }, [slots, elements, frameKind, live]);
};

export {
  postToLiveFrames,
  broadcastTokenCss,
  broadcastTweakCss,
  holdTokenCssUntilReload,
  holdTweakCssUntilReload,
  broadcastTheme,
  useCanvasTheme,
  setSharePointer,
  onSharePointer,
  setCanvasFront,
  useTokenFrameSync,
  useTokenFrames,
};

export type { ThemeChoice };
