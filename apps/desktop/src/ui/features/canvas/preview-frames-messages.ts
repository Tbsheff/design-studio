import type { BridgeToParent } from "@design-studio/contracts";

import { postToFrame } from "../../platform/bridge.js";
import type { BridgeFrame } from "../../platform/bridge.js";
import {
  requestRects,
  scheduleTree,
  syncFrame,
} from "./preview-frames-core.js";
import { onSelectMessage, onTextMessage } from "./preview-frames-select.js";
import { onPainted } from "./preview-frames-telemetry.js";
import type { PreviewState } from "./preview-frames-types.js";
import { forwardKeyMessage, isKeyMessage } from "./preview-key-forward.js";
import { applyRects, hoverOf, pagePoint } from "./preview-rect-model.js";
import { isSelectMessage } from "./preview-selection-model.js";

const handleRects = (
  state: PreviewState,
  message: Extract<BridgeToParent, { type: "rects" }>
): void => {
  if (state.dragHold) {
    state.heldRects = message;

    return;
  }

  state.opts.setSelection((prev) =>
    applyRects(prev, message.selectors, message.rects)
  );
};

const handleContextMenu = (
  state: PreviewState,
  frame: BridgeFrame,
  message: Extract<BridgeToParent, { type: "context-menu" }>
): void => {
  const at = pagePoint(frame.element, message.x, message.y);

  if (at) {
    state.opts.onContextMenu?.(at);
  }
};

const handleFrontKind = (
  state: PreviewState,
  frame: BridgeFrame,
  message: BridgeToParent
): void => {
  const { opts } = state;

  switch (message.type) {
    case "hover": {
      if (opts.selectMode || message.source === "tree") {
        state.hover.set(hoverOf(message));
      }

      break;
    }

    case "tree": {
      state.host.onTree(message);
      break;
    }

    case "rects": {
      handleRects(state, message);
      break;
    }

    case "scroll": {
      state.hover.set(null);
      requestRects(state, frame);
      break;
    }

    case "mode-exited": {
      state.hover.set(null);
      opts.onModeExited();
      break;
    }

    case "wheel": {
      opts.onFrameWheel(frame.element, message);
      break;
    }

    case "zoom-key": {
      opts.onZoomKey(message.key);
      break;
    }

    case "context-menu": {
      handleContextMenu(state, frame, message);
      break;
    }

    case "text-edit":
    case "text-commit": {
      onTextMessage(state, message);
      break;
    }

    default: {
      break;
    }
  }
};

const notifyListeners = (
  state: PreviewState,
  message: BridgeToParent
): void => {
  for (const listener of state.listeners) {
    listener(message);
  }
};

const onFrontMessage = (
  state: PreviewState,
  frame: BridgeFrame,
  message: BridgeToParent
): void => {
  notifyListeners(state, message);

  if (isKeyMessage(message)) {
    forwardKeyMessage(message, state.host);

    return;
  }

  if (isSelectMessage(message)) {
    onSelectMessage(state, message);

    return;
  }

  handleFrontKind(state, frame, message);
};

const onReady = (
  state: PreviewState,
  frame: BridgeFrame,
  message: BridgeToParent
): void => {
  notifyListeners(state, message);

  if (state.treeWanted && frame.token === state.front) {
    postToFrame(frame, { type: "request-tree" });
  }

  syncFrame(state, frame);
};

const onFramePainted = (state: PreviewState, frame: BridgeFrame): void => {
  const isFront = frame.token === state.front;

  if (isFront) {
    globalThis.dispatchEvent(new Event(state.host.paintedEvent));
  }

  if (state.treeWanted && isFront) {
    scheduleTree(state);
  }

  onPainted(state, frame);
};

const onFrameError = (
  state: PreviewState,
  frame: BridgeFrame,
  message: Extract<BridgeToParent, { type: "error" }>
): void => {
  const { opts } = state;
  state.frameErrorAt[frame.token] = Date.now();
  opts.onError({
    directionId: opts.directionId,
    file: message.source ?? null,
    line: message.line ?? null,
    message: message.message,
    source: message.kind,
  });
};

const onBridgeMessage = (
  state: PreviewState,
  frame: BridgeFrame,
  message: BridgeToParent
): void => {
  if (message.type === "ready") {
    onReady(state, frame, message);

    return;
  }

  if (message.type === "painted") {
    onFramePainted(state, frame);

    return;
  }

  if (message.type === "error") {
    onFrameError(state, frame, message);

    return;
  }

  if (frame.token === state.front) {
    onFrontMessage(state, frame, message);
  }
};

export { onBridgeMessage };
