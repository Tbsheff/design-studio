import { frameSrc, postToFrame } from "../../platform/bridge.js";
import { randomToken } from "../../platform/session.js";
import { frameFor, syncFrame } from "./preview-frames-core.js";
import type {
  ChangeInfo,
  PendingSwap,
  PreviewState,
} from "./preview-frames-types.js";
import { applyRects } from "./preview-rect-model.js";
import type { PreviewSlot } from "./preview-slot-model.js";

const VERSION_PARAM = "v";
const SWAP_FALLBACK_MS = 1500;
const LOAD_GRACE_MS = 500;
const HMR_FALLBACK_MS = 2500;
const SELECT_HOLD_MS = 900;
const COMMIT_HOLD_MS = 2000;

interface FilesChangeInput {
  readonly baseUrl: string | null;
  readonly directionId: string | null;
  readonly kind: string;
  readonly lastChange: ChangeInfo | null;
  readonly live: boolean;
}

const finishSwap = (state: PreviewState, slot: PreviewSlot): void => {
  const frame = frameFor(state, slot);
  syncFrame(state, frame);
  const [only, ...rest] = state.opts.selection;

  if (state.reselectOnSwap && only && rest.length === 0) {
    postToFrame(frame, { selector: only.selector, type: "select-selector" });
  }

  state.reselectOnSwap = false;
  globalThis.dispatchEvent(new Event(state.host.paintedEvent));
};

const swapTo = (state: PreviewState, token: string): void => {
  state.front = token;
  state.setters.front(token);
  state.setters.slots((prev) => prev.filter((entry) => entry.token === token));
  state.hover.set(null);
  const slot = state.slots.find((entry) => entry.token === token);

  if (slot) {
    globalThis.setTimeout(() => finishSwap(state, slot), 0);
  }
};

const retrySwapLater = (
  state: PreviewState,
  wait: number,
  retry: () => void
): void => {
  if (state.holdTimer !== null) {
    globalThis.clearTimeout(state.holdTimer);
  }

  state.holdTimer = globalThis.setTimeout(() => {
    state.holdTimer = null;
    retry();
  }, wait);
};

const holdSwapFor = (state: PreviewState, ms: number): void => {
  state.holdUntil = Math.max(state.holdUntil, Date.now() + ms);
};

const holdSwapForSelect = (state: PreviewState): void => {
  holdSwapFor(state, SELECT_HOLD_MS);
};

const holdSwapForCommit = (state: PreviewState): void => {
  holdSwapFor(state, COMMIT_HOLD_MS);
};

const settleSwap = (state: PreviewState, token: string): void => {
  const swap = state.pendingSwap;

  if (swap?.token !== token) {
    return;
  }

  if (state.textEditing || state.dragHold) {
    swap.due = true;
    swap.loaded = true;

    return;
  }

  const wait = state.holdUntil - Date.now();

  if (wait > 0) {
    swap.due = true;
    swap.loaded = true;
    retrySwapLater(state, wait, () => settleSwap(state, token));

    return;
  }

  globalThis.clearTimeout(swap.timer);
  state.pendingSwap = null;
  swapTo(state, token);
};

const markSwap = (
  state: PreviewState,
  token: string,
  flag: "due" | "loaded"
): void => {
  const swap = state.pendingSwap;

  if (swap?.token !== token) {
    return;
  }

  swap[flag] = true;

  if (swap.due && swap.loaded) {
    settleSwap(state, token);
  }
};

const clearPendingTimers = (state: PreviewState): void => {
  if (state.pendingSwap) {
    globalThis.clearTimeout(state.pendingSwap.timer);
  }

  if (state.hmrFallback !== null) {
    globalThis.clearTimeout(state.hmrFallback);
  }

  state.hmrFallback = null;
};

const loadFresh = (state: PreviewState, baseUrl: string | null): void => {
  clearPendingTimers(state);
  state.pendingSwap = null;
  state.pendingReact = null;
  state.hover.set(null);

  if (!baseUrl) {
    state.setters.slots([]);
    state.setters.front(null);

    return;
  }

  const token = randomToken();
  state.setters.slots([{ src: frameSrc(baseUrl), token }]);
  state.setters.front(token);
};

const checkHmr = (state: PreviewState, receivedAt: number): void => {
  state.hmrFallback = null;
  const token = state.front;

  if (!token || !(token in state.frameErrorAt)) {
    return;
  }

  if ((state.lastPaintAt[token] ?? 0) >= receivedAt) {
    return;
  }

  loadFresh(state, state.opts.baseUrl);
};

const watchHmr = (state: PreviewState, receivedAt: number): void => {
  if (state.hmrFallback !== null) {
    globalThis.clearTimeout(state.hmrFallback);
  }

  state.hmrFallback = globalThis.setTimeout(
    () => checkHmr(state, receivedAt),
    HMR_FALLBACK_MS
  );
};

const queueSwap = (
  state: PreviewState,
  baseUrl: string,
  change: ChangeInfo
): void => {
  if (state.pendingSwap) {
    globalThis.clearTimeout(state.pendingSwap.timer);
  }

  state.reselectOnSwap = change.shouldReload;
  const token = randomToken();
  const src = frameSrc(baseUrl, { [VERSION_PARAM]: String(change.changedAt) });

  state.setters.slots((prev) => [
    ...prev.filter((entry) => entry.token === state.front),
    { src, token },
  ]);

  const timer = globalThis.setTimeout(
    () => markSwap(state, token, "due"),
    SWAP_FALLBACK_MS
  );

  const pending: PendingSwap = {
    changedAt: change.changedAt,
    due: false,
    loaded: false,
    timer,
    token,
  };

  state.pendingSwap = pending;
};

const isApplicable = (input: FilesChangeInput): boolean => {
  if (!input.live || !input.baseUrl || !input.lastChange) {
    return false;
  }

  return input.lastChange.directionId === input.directionId;
};

const applyFilesChange = (
  state: PreviewState,
  input: FilesChangeInput
): void => {
  const { baseUrl, kind, lastChange: change } = input;

  if (change === state.handledChange) {
    return;
  }

  state.handledChange = change;

  if (!change || !baseUrl || !isApplicable(input)) {
    return;
  }

  if (kind === "react" && !change.shouldReload) {
    state.pendingReact = {
      changedAt: change.changedAt,
      receivedAt: change.receivedAt,
    };
    watchHmr(state, change.receivedAt);

    return;
  }

  queueSwap(state, baseUrl, change);
};

const onFrameLoad = (state: PreviewState, token: string): void => {
  if (state.pendingSwap?.token === token) {
    globalThis.setTimeout(
      () => markSwap(state, token, "loaded"),
      LOAD_GRACE_MS
    );
  }
};

const flushHeldRects = (state: PreviewState): void => {
  const rects = state.heldRects;

  if (!rects) {
    return;
  }

  state.heldRects = null;
  state.opts.setSelection((prev) =>
    applyRects(prev, rects.selectors, rects.rects)
  );
};

const releaseSwap = (state: PreviewState, swap: PendingSwap): void => {
  const cur = state.pendingSwap;

  const isIdle = !state.dragHold && !state.textEditing;

  if (cur === swap && isIdle && cur.due && cur.loaded) {
    settleSwap(state, cur.token);
  }
};

const holdSwap = (
  state: PreviewState,
  isHeld: boolean,
  shouldSettle: boolean
): void => {
  state.dragHold = isHeld;

  if (!isHeld) {
    flushHeldRects(state);
  }

  const swap = state.pendingSwap;

  if (isHeld || !swap) {
    return;
  }

  if (shouldSettle) {
    releaseSwap(state, swap);

    return;
  }

  globalThis.setTimeout(() => releaseSwap(state, swap), SWAP_FALLBACK_MS);
};

export {
  applyFilesChange,
  holdSwap,
  holdSwapForCommit,
  holdSwapForSelect,
  loadFresh,
  onFrameLoad,
  settleSwap,
};
