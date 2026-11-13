import { useCallback, useEffect } from "react";

import { IS_MAC } from "../../canvas-hook-slots.js";
import { TIDY_FRAMES_EVENT } from "../../domain/tidy-frames-events.js";
import type { TidyFramesDetail } from "../../domain/tidy-frames-events.js";
import { isTypingTarget } from "../../platform/typing-target.js";
import { useLatest } from "../../platform/use-latest.js";
import {
  isFrameAlignReady,
  toFrameAlignKeyLayout,
} from "./frame-align-model.js";
import type { FrameAlignLayout } from "./frame-align-model.js";
import { toSelectedIds } from "./frame-selection-store.js";

interface FrameAlignKeysInput {
  readonly onAlign: (layout: FrameAlignLayout) => void;
  readonly projectId: string;
  readonly selectionCount: number;
}

const toAlignKeyLayout = (
  event: KeyboardEvent,
  input: FrameAlignKeysInput
): FrameAlignLayout | null => {
  if (
    event.defaultPrevented ||
    event.repeat ||
    input.selectionCount > 0 ||
    isTypingTarget(event.target)
  ) {
    return null;
  }

  const layout = toFrameAlignKeyLayout(event, IS_MAC);
  const count = toSelectedIds(input.projectId).length;

  if (layout === null || !isFrameAlignReady(layout, count)) {
    return null;
  }

  return layout;
};

const useFrameAlignKeys = (input: FrameAlignKeysInput): void => {
  const latest = useLatest(input);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent): void => {
      const layout = toAlignKeyLayout(event, latest.current);

      if (layout === null) {
        return;
      }

      event.preventDefault();
      latest.current.onAlign(layout);
    };

    globalThis.addEventListener("keydown", handleKey);

    return (): void => globalThis.removeEventListener("keydown", handleKey);
  }, [latest]);
};

const useFrameAlign = (): ((layout: FrameAlignLayout) => void) =>
  useCallback((layout: FrameAlignLayout): void => {
    const detail: TidyFramesDetail = { frameId: null, layout };

    globalThis.dispatchEvent(new CustomEvent(TIDY_FRAMES_EVENT, { detail }));
  }, []);

export { useFrameAlign, useFrameAlignKeys };

export type { FrameAlignKeysInput };
