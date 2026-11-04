import { useCallback, useEffect, useRef, useState } from "react";

import { toTimelineMs } from "./animation-model.js";
import type { Draft } from "./animation-model.js";
import type { ParentMessageBody } from "./deps.js";

interface PlaybackOptions {
  readonly draft: Draft | null;
  readonly post: (body: ParentMessageBody) => void;
}

interface PlaybackState {
  readonly isPlaying: boolean;
  readonly onScrub: (timeMs: number) => void;
  readonly onToggle: () => void;
  readonly timeMs: number;
}

interface PreviewStyle extends Record<string, string> {
  readonly "animation-delay": string;
  readonly "animation-duration": string;
  readonly "animation-fill-mode": string;
  readonly "animation-iteration-count": string;
  readonly "animation-name": string;
  readonly "animation-play-state": string;
  readonly "animation-timeline": string;
  readonly "animation-timing-function": string;
}

const toStyle = (
  draft: Draft,
  trackIndex: number,
  timeMs: number
): PreviewStyle => ({
  "animation-delay": `${(draft.tracks[trackIndex]?.delayMs ?? 0) - timeMs}ms`,
  "animation-duration": `${draft.durationMs}ms`,
  "animation-fill-mode": "both",
  "animation-iteration-count": "1",
  "animation-name": `ds-${draft.id}-${trackIndex}`,
  "animation-play-state": "paused",
  "animation-timeline": "auto",
  "animation-timing-function": "linear",
});

const postFrame = (
  post: PlaybackOptions["post"],
  draft: Draft,
  timeMs: number
): void => {
  for (const [index, track] of draft.tracks.entries()) {
    post({
      selector: track.selector,
      style: toStyle(draft, index, timeMs),
      type: "preview-style",
    });
  }
};

const toStart = (timeMs: number, total: number): number => {
  if (timeMs >= total) {
    return 0;
  }

  return timeMs;
};

const stopNothing = (): null => null;

const usePlayback = ({ draft, post }: PlaybackOptions): PlaybackState => {
  const [timeMs, setTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const clock = useRef(0);

  const onScrub = useCallback(
    (at: number): void => {
      clock.current = at;
      setTimeMs(at);

      if (draft !== null) {
        postFrame(post, draft, at);
      }
    },
    [draft, post]
  );

  const onToggle = useCallback((): void => {
    setIsPlaying((was) => !was);
  }, []);

  useEffect(() => {
    if (!isPlaying || draft === null) {
      return stopNothing;
    }

    const total = toTimelineMs(draft);
    const origin = performance.now() - toStart(clock.current, total);
    let handle = 0;

    const tick = (now: number): void => {
      const at = Math.min(total, now - origin);

      clock.current = at;
      setTimeMs(at);
      postFrame(post, draft, at);

      if (at >= total) {
        setIsPlaying(false);

        return;
      }

      handle = requestAnimationFrame(tick);
    };

    handle = requestAnimationFrame(tick);

    return (): void => cancelAnimationFrame(handle);
  }, [draft, isPlaying, post]);

  useEffect(
    (): (() => void) => (): void => {
      post({ type: "preview-reset" });
    },
    [post]
  );

  return { isPlaying, onScrub, onToggle, timeMs };
};

export { usePlayback };

export type { PlaybackState };
