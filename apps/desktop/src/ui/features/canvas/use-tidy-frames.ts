import type { WireInput } from "@design-studio/actions/_core/action";
import type { moveFramesCanvas } from "@design-studio/actions/canvas/move-frames";
import { routes } from "@design-studio/actions/canvas/routes";
import { useCallback, useEffect, useTransition } from "react";

import { matchesKey } from "../../../shared/keymap.js";
import { IS_MAC } from "../../canvas-hook-slots.js";
import { TIDY_FRAMES_EVENT } from "../../domain/tidy-frames-events.js";
import type {
  TidyFramesDetail,
  TidyFramesLayout,
} from "../../domain/tidy-frames-events.js";
import { call } from "../../platform/http.js";
import { isTypingTarget } from "../../platform/typing-target.js";
import { useLatest } from "../../platform/use-latest.js";
import { canvasStore } from "./canvas-frames-model.js";
import { isFrameAlignLayout, isFrameAlignReady } from "./frame-align-model.js";
import type { FrameAlignLayout } from "./frame-align-model.js";
import { toSelectedIds } from "./frame-selection-store.js";
import { toInsideIds } from "./section-model.js";
import { useFrameAlignKeys } from "./use-frame-align.js";

interface TidyFramesInput {
  readonly projectId: string;
  readonly selectionCount: number;
}

type TidyFramesWire = WireInput<typeof moveFramesCanvas>;

const TIDY_GAP = 80;

const toDetail = (event: Event): TidyFramesDetail | null => {
  if (event instanceof CustomEvent) {
    return event.detail as TidyFramesDetail | null;
  }

  return null;
};

const toSectionId = (
  projectId: string,
  frameId: string | null
): string | null => {
  const layout = canvasStore.get(projectId);
  const id = frameId ?? layout?.activeId ?? null;
  const frame = layout?.frames.find((item) => item.id === id) ?? null;

  if (frame === null) {
    return null;
  }

  const section = canvasStore
    .sections(projectId)
    .find((item) => toInsideIds(item, [frame]).length > 0);

  return section?.id ?? null;
};

const toAlignWire = (
  forProject: string,
  alignLayout: FrameAlignLayout
): TidyFramesWire | null => {
  const selected = toSelectedIds(forProject);

  if (!isFrameAlignReady(alignLayout, selected.length)) {
    return null;
  }

  return {
    frames: [...selected],
    gap: TIDY_GAP,
    layout: alignLayout,
    projectId: forProject,
    section: null,
  };
};

const toTidyWire = (
  forProject: string,
  frameId: string | null,
  tidyLayout: TidyFramesLayout
): TidyFramesWire | null => {
  if (isFrameAlignLayout(tidyLayout)) {
    return toAlignWire(forProject, tidyLayout);
  }

  const selected = toSelectedIds(forProject);

  if (selected.length >= 2) {
    return {
      frames: [...selected],
      gap: TIDY_GAP,
      layout: tidyLayout,
      projectId: forProject,
      section: null,
    };
  }

  return {
    frames: null,
    gap: TIDY_GAP,
    layout: tidyLayout,
    projectId: forProject,
    section: toSectionId(forProject, frameId),
  };
};

const isTidyKey = (event: KeyboardEvent, selectionCount: number): boolean => {
  if (event.defaultPrevented || event.repeat || selectionCount > 0) {
    return false;
  }

  return !isTypingTarget(event.target) && matchesKey("tidy-up", event, IS_MAC);
};

const useTidyFrames = (input: TidyFramesInput): void => {
  const [, startTransition] = useTransition();
  const latest = useLatest(input);

  const tidyFrames = useCallback(
    (frameId: string | null, layout: TidyFramesLayout): void => {
      const wire = toTidyWire(latest.current.projectId, frameId, layout);

      if (wire === null) {
        return;
      }

      startTransition(async () => {
        try {
          await call(routes.moveFramesCanvas, wire);
        } catch (error) {
          globalThis.reportError(error);
        }
      });
    },
    [latest]
  );

  const alignFrames = useCallback(
    (layout: FrameAlignLayout): void => tidyFrames(null, layout),
    [tidyFrames]
  );

  useFrameAlignKeys({
    onAlign: alignFrames,
    projectId: input.projectId,
    selectionCount: input.selectionCount,
  });

  useEffect(() => {
    const handleKey = (event: KeyboardEvent): void => {
      if (!isTidyKey(event, latest.current.selectionCount)) {
        return;
      }

      event.preventDefault();
      tidyFrames(null, "tidy");
    };

    const handleEvent = (event: Event): void => {
      const detail = toDetail(event);

      tidyFrames(detail?.frameId ?? null, detail?.layout ?? "tidy");
    };

    globalThis.addEventListener("keydown", handleKey);
    globalThis.addEventListener(TIDY_FRAMES_EVENT, handleEvent);

    return (): void => {
      globalThis.removeEventListener("keydown", handleKey);
      globalThis.removeEventListener(TIDY_FRAMES_EVENT, handleEvent);
    };
  }, [latest, tidyFrames]);
};

export { useTidyFrames };

export type { TidyFramesInput };
