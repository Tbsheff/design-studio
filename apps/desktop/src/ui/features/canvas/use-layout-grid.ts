import { routes } from "@design-studio/actions/canvas/routes";
import type { CanvasLayoutGrid } from "@design-studio/contracts/layout-grid";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useTransition,
} from "react";
import type { RefObject } from "react";

import { IS_MAC } from "../../canvas-hook-slots.js";
import { call } from "../../platform/http.js";
import { uiStore, useUi } from "../../platform/storage.js";
import { isTypingTarget } from "../../platform/typing-target.js";
import { useLatest } from "../../platform/use-latest.js";
import { layoutGridCopy } from "./copy.js";
import {
  LAYOUT_GRID_EVENT,
  fromDraft,
  isSameGrid,
  toDefaultGrid,
  toDraft,
  toPresetGrid,
} from "./layout-grid-model.js";
import type {
  LayoutGridDetail,
  LayoutGridDraft,
  LayoutGridPresetId,
} from "./layout-grid-model.js";

const FRAME_SELECTOR = "[data-frame-id]";

interface LayoutGridEntry {
  readonly icon: "frame";
  readonly id: string;
  readonly label: string;
  readonly run: () => void;
}

interface LayoutGridPopover {
  readonly close: () => void;
  readonly frameId: string | null;
  readonly isPending: boolean;
  readonly setGrid: (grid: CanvasLayoutGrid | null) => void;
}

interface LayoutGridDraftControl {
  readonly change: (field: keyof LayoutGridDraft, value: string) => void;
  readonly commit: () => void;
  readonly draft: LayoutGridDraft;
  readonly pick: (preset: LayoutGridPresetId) => void;
  readonly remove: () => void;
}

interface LayoutGridDraftInput {
  readonly frameWidth: number;
  readonly grid: CanvasLayoutGrid | null;
  readonly setGrid: (grid: CanvasLayoutGrid | null) => void;
}

const toggleLayoutGrids = (): void =>
  uiStore.set((previous) => ({
    isLayoutGridShown: !previous.isLayoutGridShown,
  }));

const toFrameId = (event: Event): string | null => {
  if (!(event instanceof CustomEvent)) {
    return null;
  }

  const detail: LayoutGridDetail | null = event.detail ?? null;

  return detail?.frameId ?? null;
};

const isLayoutGridKey = (
  event: KeyboardEvent,
  selectionCount: number
): boolean => {
  if (event.defaultPrevented || event.repeat || isTypingTarget(event.target)) {
    return false;
  }

  if (!IS_MAC && selectionCount > 0) {
    return false;
  }

  const hasOtherModifier = event.metaKey || event.altKey || event.shiftKey;

  return event.code === "KeyG" && event.ctrlKey && !hasOtherModifier;
};

const useLayoutGridEntry = (
  root: RefObject<HTMLElement | null>
): LayoutGridEntry => {
  const run = useCallback((): void => {
    const frame = root.current?.closest<HTMLElement>(FRAME_SELECTOR) ?? null;

    const detail: LayoutGridDetail = {
      frameId: frame?.dataset.frameId ?? null,
    };

    globalThis.dispatchEvent(new CustomEvent(LAYOUT_GRID_EVENT, { detail }));
  }, [root]);

  return useMemo(
    () => ({
      icon: "frame",
      id: "layout-grid",
      label: layoutGridCopy.menu,
      run,
    }),
    [run]
  );
};

const useLayoutGridShown = (): boolean => useUi().isLayoutGridShown;

const useLayoutGridKey = (selectionCount: number): void => {
  const latest = useLatest(selectionCount);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent): void => {
      if (!isLayoutGridKey(event, latest.current)) {
        return;
      }

      event.preventDefault();
      toggleLayoutGrids();
    };

    globalThis.addEventListener("keydown", handleKey);

    return (): void => globalThis.removeEventListener("keydown", handleKey);
  }, [latest]);
};

const useLayoutGridPopover = (projectId: string): LayoutGridPopover => {
  const [frameId, setFrameId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const latest = useLatest({ frameId, projectId });

  useEffect(() => {
    const handleOpen = (event: Event): void => {
      setFrameId(toFrameId(event));
    };

    globalThis.addEventListener(LAYOUT_GRID_EVENT, handleOpen);

    return (): void =>
      globalThis.removeEventListener(LAYOUT_GRID_EVENT, handleOpen);
  }, []);

  const close = useCallback((): void => setFrameId(null), []);

  const setGrid = useCallback(
    (grid: CanvasLayoutGrid | null): void => {
      const target = latest.current;

      if (target.frameId === null) {
        return;
      }

      const input = {
        frame: target.frameId,
        layoutGrid: grid,
        projectId: target.projectId,
      };

      startTransition(async () => {
        try {
          await call(routes.setLayoutGridCanvas, input);
          uiStore.set({ isLayoutGridShown: true });
        } catch (error) {
          globalThis.reportError(error);
        }
      });
    },
    [latest]
  );

  return useMemo(
    () => ({ close, frameId, isPending, setGrid }),
    [close, frameId, isPending, setGrid]
  );
};

const useLayoutGridDraft = (
  input: LayoutGridDraftInput
): LayoutGridDraftControl => {
  const { frameWidth, grid, setGrid } = input;

  const [draft, setDraft] = useState(() =>
    toDraft(grid ?? toDefaultGrid(frameWidth))
  );

  const change = useCallback(
    (field: keyof LayoutGridDraft, value: string): void =>
      setDraft((previous) => ({ ...previous, [field]: value })),
    []
  );

  const commit = useCallback((): void => {
    const next = fromDraft(draft, grid ?? toDefaultGrid(frameWidth));

    if (!isSameGrid(next, grid)) {
      setGrid(next);
    }
  }, [draft, frameWidth, grid, setGrid]);

  const pick = useCallback(
    (preset: LayoutGridPresetId): void =>
      setGrid(toPresetGrid(preset, grid, frameWidth)),
    [frameWidth, grid, setGrid]
  );

  const remove = useCallback((): void => setGrid(null), [setGrid]);

  return useMemo(
    () => ({ change, commit, draft, pick, remove }),
    [change, commit, draft, pick, remove]
  );
};

export {
  toggleLayoutGrids,
  useLayoutGridDraft,
  useLayoutGridEntry,
  useLayoutGridKey,
  useLayoutGridPopover,
  useLayoutGridShown,
};

export type { LayoutGridDraftControl, LayoutGridEntry, LayoutGridPopover };
