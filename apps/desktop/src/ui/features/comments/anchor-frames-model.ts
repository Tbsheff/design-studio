import type { FrameSet } from "./comment-layer-types.js";
import type { BridgeFrame, ProjectKind } from "./deps.js";

const toBridgeFrame = (
  frames: FrameSet,
  kind: ProjectKind,
  wanted: string | null
): BridgeFrame | null => {
  const slot = frames.slots.find((item) => item.token === wanted);

  if (!slot) {
    return null;
  }

  const element = frames.elements.current[slot.token] ?? null;
  const key = slot.token;
  const { token } = slot;
  const url = slot.src;

  return { element, key, kind, token, url };
};

const toBridgeFrames = (frames: FrameSet, kind: ProjectKind): BridgeFrame[] =>
  frames.slots
    .map((slot) => toBridgeFrame(frames, kind, slot.token))
    .filter((item): item is BridgeFrame => item !== null);

export { toBridgeFrame, toBridgeFrames };
