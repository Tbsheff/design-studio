import { frameName } from "./canvas-frame-ops.js";
import type { CanvasFrame } from "./canvas-layout-types.js";

interface PresenceMark {
  readonly agent: string;
  readonly at: number;
  readonly frameId: string;
}

interface PresenceTarget {
  readonly directionId: string | null;
  readonly frameId: string | null;
}

interface PresenceScope {
  readonly activeId: string;
  readonly directionId: string | null;
  readonly frames: readonly CanvasFrame[];
}

const PRESENCE_MS = 4500;

const isShown = (frame: CanvasFrame): boolean => frame.hidden !== true;

const toDirectionFrames = (
  scope: PresenceScope,
  directionId: string
): CanvasFrame[] =>
  scope.frames.filter(
    (frame) =>
      isShown(frame) && (frame.directionId ?? scope.directionId) === directionId
  );

const toPresenceFrameId = (
  scope: PresenceScope,
  target: PresenceTarget
): string | null => {
  const named = scope.frames.find((frame) => frame.id === target.frameId);

  if (named && isShown(named)) {
    return named.id;
  }

  if (target.directionId === null) {
    return null;
  }

  const matches = toDirectionFrames(scope, target.directionId);
  const active = matches.find((frame) => frame.id === scope.activeId);

  return (active ?? matches[0])?.id ?? null;
};

const withMark = (
  marks: readonly PresenceMark[],
  mark: PresenceMark
): PresenceMark[] => [
  ...marks.filter((entry) => entry.agent !== mark.agent),
  mark,
];

const toLiveMarks = (
  marks: readonly PresenceMark[],
  now: number
): PresenceMark[] => marks.filter((mark) => now - mark.at < PRESENCE_MS);

const toNextExpiry = (marks: readonly PresenceMark[], now: number): number =>
  Math.max(0, Math.min(...marks.map((mark) => mark.at + PRESENCE_MS - now)));

const toPresenceFrameName = (frame: CanvasFrame): string =>
  frame.label ?? frameName(frame);

const toLatestMark = (marks: readonly PresenceMark[]): PresenceMark | null =>
  marks.toSorted((left, right) => right.at - left.at)[0] ?? null;

export {
  PRESENCE_MS,
  toLatestMark,
  toLiveMarks,
  toNextExpiry,
  toPresenceFrameId,
  toPresenceFrameName,
  withMark,
};

export type { PresenceMark, PresenceScope, PresenceTarget };
