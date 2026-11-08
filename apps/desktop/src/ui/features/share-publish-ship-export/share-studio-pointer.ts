import { routes } from "@design-studio/actions/share/routes";
import type { StudioCursorInput } from "@design-studio/contracts/share";

import type { BridgeFrame } from "../../platform/bridge.js";
import { call } from "../../platform/http.js";
import { pick } from "./pick.js";

const SEND_MS = 50;
const FRAME_SELECTOR = ".artboard[data-frame-id], .canvas-frame[data-frame-id]";
const NO_CURSOR: StudioCursorInput = { frameId: null, x: 0, y: 0 };

interface PointerBridge {
  readonly onFrame: (
    listener: (frame: BridgeFrame, message: FramePointer) => void
  ) => () => void;
  readonly setPointer: (isOn: boolean) => void;
}

interface StudioPointer {
  readonly set: (isOn: boolean) => void;
}

interface FramePointer {
  readonly inside: boolean;
  readonly x: number;
  readonly y: number;
}

interface PendingCursor {
  readonly value: StudioCursorInput | null;
}

interface PointerState {
  isOn: boolean;
  lastFrame: string | null;
  stopFrames: (() => void) | null;
}

interface QueueState {
  pending: PendingCursor | null;
  timer: ReturnType<typeof globalThis.setTimeout> | null;
}

const toFrameAncestor = (from: Element | null): HTMLElement | null => {
  let node = from;

  while (node) {
    if (node instanceof HTMLElement && node.matches(FRAME_SELECTOR)) {
      return node;
    }

    node = node.parentElement;
  }

  return null;
};

const toElement = (target: EventTarget | null): Element | null => {
  if (target instanceof Element) {
    return target;
  }

  return null;
};

interface IframePoint {
  readonly element: HTMLElement;
  readonly x: number;
  readonly y: number;
}

const toIframePoint = (
  frame: BridgeFrame,
  message: FramePointer
): IframePoint | null => {
  const iframe = frame.element;

  if (!message.inside || !iframe || iframe.offsetWidth === 0) {
    return null;
  }

  const rect = iframe.getBoundingClientRect();
  const scale = rect.width / iframe.offsetWidth;

  return {
    element: iframe,
    x: rect.left + message.x * scale,
    y: rect.top + message.y * scale,
  };
};

const toCursorAt = (
  root: HTMLElement | null,
  from: Element | null,
  clientX: number,
  clientY: number
): StudioCursorInput | null => {
  const target = toFrameAncestor(from);

  if (!root || !target || !root.contains(target) || target.offsetWidth === 0) {
    return null;
  }

  const rect = target.getBoundingClientRect();
  const scale = rect.width / target.offsetWidth;

  return {
    frameId: target.dataset["frameId"] ?? null,
    x: Math.max(0, (clientX - rect.left) / scale),
    y: Math.max(0, (clientY - rect.top) / scale),
  };
};

const sendCursor = async (
  projectId: string,
  body: StudioCursorInput
): Promise<boolean> => {
  try {
    await call(routes.setCursorShare, {
      frameId: body.frameId,
      pointX: body.x,
      pointY: body.y,
      projectId,
    });

    return true;
  } catch {
    return false;
  }
};

const createCursorQueue = (
  projectId: string
): ((value: StudioCursorInput | null) => void) => {
  const state: QueueState = { pending: null, timer: null };

  const flush = (): void => {
    state.timer = null;

    if (state.pending === null) {
      return;
    }

    const body = state.pending.value ?? NO_CURSOR;
    state.pending = null;
    void sendCursor(projectId, body);
  };

  return (value: StudioCursorInput | null): void => {
    state.pending = { value };

    if (!state.timer) {
      state.timer = globalThis.setTimeout(flush, SEND_MS);
    }
  };
};

const createStudioPointer = (
  projectId: string,
  stage: () => HTMLElement | null,
  bridge: PointerBridge
): StudioPointer => {
  const state: PointerState = {
    isOn: false,
    lastFrame: null,
    stopFrames: null,
  };

  const queue = createCursorQueue(projectId);

  const handleLeave = (): void => {
    if (state.lastFrame !== null) {
      queue(null);
    }

    state.lastFrame = null;
  };

  const track = (
    from: Element | null,
    clientX: number,
    clientY: number
  ): void => {
    const cursor = toCursorAt(stage(), from, clientX, clientY);

    if (!cursor) {
      handleLeave();

      return;
    }

    state.lastFrame = cursor.frameId;
    queue(cursor);
  };

  const handleMove = (event: PointerEvent): void => {
    track(toElement(event.target), event.clientX, event.clientY);
  };

  const handleFrame = (frame: BridgeFrame, message: FramePointer): void => {
    const point = toIframePoint(frame, message);

    if (point) {
      track(point.element, point.x, point.y);
    }
  };

  const start = (): void => {
    document.addEventListener("pointermove", handleMove, true);
    document.documentElement.addEventListener("pointerleave", handleLeave);
    state.stopFrames = bridge.onFrame(handleFrame);
  };

  const stop = (): void => {
    document.removeEventListener("pointermove", handleMove, true);
    document.documentElement.removeEventListener("pointerleave", handleLeave);
    state.stopFrames?.();
    state.stopFrames = null;
    handleLeave();
  };

  return {
    set: (isOn: boolean): void => {
      if (isOn === state.isOn) {
        return;
      }

      state.isOn = isOn;
      bridge.setPointer(isOn);
      pick(isOn, start, stop)();
    },
  };
};

export { createStudioPointer };

export type { FramePointer, PointerBridge, StudioPointer };
