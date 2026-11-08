import { postToFrame } from "../../platform/bridge.js";
import type { BridgeFrame, ParentMessageBody } from "../../platform/bridge.js";
import type { PreviewState } from "./preview-frames-types.js";
import type { PreviewSlot } from "./preview-slot-model.js";

const TREE_REFRESH_MS = 400;

const toMode = (isSelect: boolean): "select" | "none" => {
  if (isSelect) {
    return "select";
  }

  return "none";
};

const frameFor = (state: PreviewState, slot: PreviewSlot): BridgeFrame => ({
  element: state.elements.current[slot.token] ?? null,
  key: slot.token,
  kind: state.opts.kind,
  token: slot.token,
  url: slot.src,
});

const frameForToken = (
  state: PreviewState,
  token: string | null
): BridgeFrame | null => {
  const slot = state.slots.find((entry) => entry.token === token);

  if (slot) {
    return frameFor(state, slot);
  }

  return null;
};

const frontFrame = (state: PreviewState): BridgeFrame | null =>
  frameForToken(state, state.front);

const requestRects = (state: PreviewState, frame: BridgeFrame | null): void => {
  if (!frame) {
    return;
  }

  const selectors = state.opts.selection.map((entry) => entry.selector);
  postToFrame(frame, { selectors, type: "request-rects" });
};

const requestRectsFor = (
  state: PreviewState,
  token: string | null,
  selectorKey: string
): void => {
  const frame = frameForToken(state, token);

  if (!frame) {
    return;
  }

  let selectors: string[] = [];

  if (selectorKey !== "") {
    selectors = selectorKey.split("\n");
  }

  postToFrame(frame, { selectors, type: "request-rects" });
};

const syncFrame = (state: PreviewState, frame: BridgeFrame): void => {
  const { opts } = state;

  postToFrame(frame, {
    marquee: opts.marquee === true,
    mode: toMode(opts.selectMode),
    type: "set-mode",
  });
  postToFrame(frame, {
    allowed: opts.textEditAllowed === true,
    type: "text-edit-allowed",
  });
  requestRects(state, frame);
};

const postFront = (state: PreviewState, body: ParentMessageBody): void => {
  const frame = frontFrame(state);

  if (frame) {
    postToFrame(frame, body);
  }
};

const postMode = (
  state: PreviewState,
  token: string | null,
  isSelectMode: boolean,
  isMarquee: boolean
): void => {
  const frame = frameForToken(state, token);

  if (frame) {
    postToFrame(frame, {
      marquee: isMarquee,
      mode: toMode(isSelectMode),
      type: "set-mode",
    });
  }

  if (!isSelectMode) {
    state.hover.set(null);
  }
};

const postTextAllowed = (
  state: PreviewState,
  token: string | null,
  isAllowed: boolean
): void => {
  const frame = frameForToken(state, token);

  if (!frame) {
    return;
  }

  if (!isAllowed) {
    postToFrame(frame, { type: "text-edit-stop" });
  }

  postToFrame(frame, { allowed: isAllowed, type: "text-edit-allowed" });
};

const scheduleTree = (state: PreviewState): void => {
  if (state.treeTimer !== null) {
    return;
  }

  state.treeTimer = globalThis.setTimeout(() => {
    state.treeTimer = null;

    if (state.treeWanted) {
      postFront(state, { type: "request-tree" });
    }
  }, TREE_REFRESH_MS);
};

const watchTree = (state: PreviewState, isOn: boolean): void => {
  state.treeWanted = isOn;

  if (isOn) {
    postFront(state, { type: "request-tree" });
  }
};

const clearTreeTimer = (state: PreviewState): void => {
  if (state.treeTimer !== null) {
    globalThis.clearTimeout(state.treeTimer);
  }
};

export {
  clearTreeTimer,
  frameFor,
  frameForToken,
  frontFrame,
  postFront,
  postMode,
  postTextAllowed,
  requestRects,
  requestRectsFor,
  scheduleTree,
  syncFrame,
  watchTree,
};
