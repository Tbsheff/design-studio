import { setForceState } from "./deps.js";
import type { MotionState, PreviewPort } from "./deps.js";
import { REPLAY_GAP_MS, replayMs } from "./motion-model.js";
import type { MotionDraft } from "./motion-model.js";

type Timer = ReturnType<typeof globalThis.setTimeout>;

interface ReplayTarget {
  readonly selector: string;
  readonly state: MotionState | null;
  readonly variant: string;
}

const resetLater = (port: PreviewPort, wait: number): Timer =>
  globalThis.setTimeout(() => {
    port.post({ type: "preview-reset" });
  }, wait);

const replayEntrance = (port: PreviewPort, selector: string): Timer => {
  port.post({ selector, style: { display: "none" }, type: "preview-style" });

  return resetLater(port, REPLAY_GAP_MS);
};

const replayTransition = (
  port: PreviewPort,
  target: ReplayTarget,
  draft: MotionDraft
): Timer => {
  const { selector, state, variant } = target;

  if (state) {
    setForceState(port, selector, state);

    return globalThis.setTimeout(() => {
      setForceState(port, selector, variant);
    }, replayMs(draft));
  }

  port.post({ selector, style: { opacity: "0.4" }, type: "preview-style" });

  return resetLater(port, replayMs(draft));
};

const replay = (
  port: PreviewPort,
  target: ReplayTarget,
  draft: MotionDraft
): Timer => {
  if (draft.kind === "entrance") {
    return replayEntrance(port, target.selector);
  }

  return replayTransition(port, target, draft);
};

export { replay };

export type { ReplayTarget, Timer };
