import type {
  AnimationKeyframe,
  AnimationModel,
  AnimationTrack,
  FrameDraft,
} from "./types.js";

const PERCENT_DIGITS = 1000;

const FULL = 100;

const toPercent = (timeMs: number, durationMs: number): number => {
  const raw = (timeMs / durationMs) * FULL;

  return Math.round(Math.min(FULL, raw) * PERCENT_DIGITS) / PERCENT_DIGITS;
};

const toHeld = (
  keyframes: readonly AnimationKeyframe[],
  durationMs: number
): readonly AnimationKeyframe[] => {
  const sorted = keyframes.toSorted(
    (left, right) => left.timeMs - right.timeMs
  );

  const [first] = sorted;
  const last = sorted.at(-1);
  const held: AnimationKeyframe[] = [...sorted];

  if (first && first.timeMs > 0) {
    held.unshift({ easing: first.easing, timeMs: 0, value: first.value });
  }

  if (last && last.timeMs < durationMs) {
    held.push({ easing: last.easing, timeMs: durationMs, value: last.value });
  }

  return held;
};

const toFrames = (
  track: AnimationTrack,
  durationMs: number
): readonly FrameDraft[] => {
  const byTime = new Map<number, { easing: string; lines: string[] }>();

  for (const entry of track.properties) {
    for (const key of toHeld(entry.keyframes, durationMs)) {
      const frame = byTime.get(key.timeMs) ?? {
        easing: key.easing,
        lines: [],
      };

      frame.lines.push(`${entry.property}:${key.value}`);
      byTime.set(key.timeMs, frame);
    }
  }

  return [...byTime.entries()]
    .toSorted((left, right) => left[0] - right[0])
    .map(([timeMs, frame]) => ({
      declarations: frame.lines,
      easing: frame.easing,
      percent: toPercent(timeMs, durationMs),
    }));
};

const toEndDeclarations = (track: AnimationTrack): readonly string[] =>
  track.properties.map((entry) => {
    const [last] = entry.keyframes.toSorted(
      (left, right) => right.timeMs - left.timeMs
    );

    return `${entry.property}:${last?.value ?? "initial"}`;
  });

const toTimelineMs = (model: AnimationModel): number =>
  Math.max(
    model.durationMs,
    ...model.tracks.map((track) => track.delayMs + model.durationMs)
  );

export { toEndDeclarations, toFrames, toPercent, toTimelineMs };
