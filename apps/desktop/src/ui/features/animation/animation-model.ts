import type { animationRoutes, RouteOutput } from "./deps.js";

type Draft = RouteOutput<typeof animationRoutes.getAnimation>["animation"];

type Track = Draft["tracks"][number];

type PropertyTrack = Track["properties"][number];

type Keyframe = PropertyTrack["keyframes"][number];

interface KeyframeRef {
  readonly keyIndex: number;
  readonly propertyIndex: number;
  readonly trackIndex: number;
}

const SNAP_MS = 10;

const FULL_PERCENT = 100;

const MIN_DURATION_MS = 50;

const DEFAULT_DURATION_MS = 1200;

const toSnapped = (timeMs: number, durationMs: number): number => {
  const snapped = Math.round(timeMs / SNAP_MS) * SNAP_MS;

  return Math.min(durationMs, Math.max(0, snapped));
};

const toPercent = (timeMs: number, durationMs: number): number =>
  (timeMs / durationMs) * FULL_PERCENT;

const toTimelineMs = (draft: Draft): number =>
  Math.max(
    draft.durationMs,
    ...draft.tracks.map((track) => track.delayMs + draft.durationMs)
  );

const toNewDraft = (selector: string): Omit<Draft, "file" | "id"> => ({
  durationMs: DEFAULT_DURATION_MS,
  loop: "once",
  name: "New animation",
  tracks: [
    {
      delayMs: 0,
      properties: [
        {
          keyframes: [
            { easing: "ease-out", timeMs: 0, value: "0" },
            { easing: "ease-out", timeMs: 600, value: "1" },
          ],
          property: "opacity",
        },
        {
          keyframes: [
            { easing: "ease-out", timeMs: 0, value: "translateY(24px)" },
            { easing: "ease-out", timeMs: 600, value: "translateY(0px)" },
          ],
          property: "transform",
        },
      ],
      selector,
    },
  ],
  trigger: "load",
});

const toKeyframe = (draft: Draft, ref: KeyframeRef): Keyframe | null =>
  draft.tracks[ref.trackIndex]?.properties[ref.propertyIndex]?.keyframes[
    ref.keyIndex
  ] ?? null;

const toTracksWith = (
  draft: Draft,
  ref: KeyframeRef,
  change: (keyframes: Keyframe[]) => Keyframe[]
): Draft => ({
  ...draft,
  tracks: draft.tracks.map((track, trackIndex) => {
    if (trackIndex !== ref.trackIndex) {
      return track;
    }

    return {
      ...track,
      properties: track.properties.map((entry, propertyIndex) => {
        if (propertyIndex !== ref.propertyIndex) {
          return entry;
        }

        return { ...entry, keyframes: change(entry.keyframes) };
      }),
    };
  }),
});

const toPatched = (
  draft: Draft,
  ref: KeyframeRef,
  patch: Partial<Keyframe>
): Draft =>
  toTracksWith(draft, ref, (keyframes) =>
    keyframes.map((key, keyIndex) => {
      if (keyIndex !== ref.keyIndex) {
        return key;
      }

      return { ...key, ...patch };
    })
  );

const toMoved = (draft: Draft, ref: KeyframeRef, timeMs: number): Draft =>
  toPatched(draft, ref, { timeMs: toSnapped(timeMs, draft.durationMs) });

const toAdded = (draft: Draft, ref: KeyframeRef, timeMs: number): Draft =>
  toTracksWith(draft, ref, (keyframes) => {
    const [near] = keyframes.toSorted(
      (left, right) =>
        Math.abs(left.timeMs - timeMs) - Math.abs(right.timeMs - timeMs)
    );

    const added: Keyframe = {
      easing: near?.easing ?? "linear",
      timeMs: toSnapped(timeMs, draft.durationMs),
      value: near?.value ?? "0",
    };

    return [...keyframes, added];
  });

const toRemoved = (draft: Draft, ref: KeyframeRef): Draft =>
  toTracksWith(draft, ref, (keyframes) => {
    if (keyframes.length <= 1) {
      return keyframes;
    }

    return keyframes.filter((_key, keyIndex) => keyIndex !== ref.keyIndex);
  });

const toWithDuration = (draft: Draft, durationMs: number): Draft => ({
  ...draft,
  durationMs,
  tracks: draft.tracks.map((track) => ({
    ...track,
    properties: track.properties.map((entry) => ({
      ...entry,
      keyframes: entry.keyframes.map((key) => ({
        ...key,
        timeMs: Math.min(key.timeMs, durationMs),
      })),
    })),
  })),
});

const isSameRef = (left: KeyframeRef | null, right: KeyframeRef): boolean =>
  left !== null &&
  left.trackIndex === right.trackIndex &&
  left.propertyIndex === right.propertyIndex &&
  left.keyIndex === right.keyIndex;

const toRefKey = (ref: KeyframeRef): string =>
  `${ref.trackIndex}-${ref.propertyIndex}-${ref.keyIndex}`;

export {
  MIN_DURATION_MS,
  isSameRef,
  toAdded,
  toKeyframe,
  toMoved,
  toNewDraft,
  toPatched,
  toPercent,
  toRefKey,
  toRemoved,
  toSnapped,
  toTimelineMs,
  toWithDuration,
};

export type { Draft, Keyframe, KeyframeRef, PropertyTrack, Track };
