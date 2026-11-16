import type { SelectionContext } from "@design-studio/contracts";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import type {
  ChangeEvent,
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent,
  RefObject,
} from "react";

import { useLive } from "../../platform/live-store.js";
import {
  scaleFocusCount,
  scaleKeepTokens,
  stopScaleMode,
} from "../../platform/scale-mode.js";
import { copy } from "./copy.js";
import { layerStyleRoutes, useAction } from "./deps.js";
import {
  FULL_PERCENT,
  FULL_TEXT,
  isScaleInRange,
  toScaleLayerId,
  toScaleNote,
  toScalePercent,
  toScrubPercent,
} from "./scale-field-model.js";
import type { DirectEdit } from "./use-direct-edit.js";
import { useLatestRef } from "./use-latest-ref.js";

interface ScaleField {
  readonly draft: string;
  readonly handleDraftInput: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly handleKeyDown: (event: ReactKeyboardEvent<HTMLInputElement>) => void;
  readonly handleScrubDown: (event: PointerEvent<HTMLElement>) => void;
  readonly handleScrubMove: (event: PointerEvent<HTMLElement>) => void;
  readonly handleScrubUp: (event: PointerEvent<HTMLElement>) => void;
  readonly inputRef: RefObject<HTMLInputElement | null>;
  readonly isDisabled: boolean;
  readonly note: string | null;
}

interface ScrubStart {
  readonly percent: number;
  readonly x: number;
}

interface ScaleCommit {
  readonly commit: (text: string) => void;
  readonly isPending: boolean;
  readonly note: string | null;
}

interface ScaleTarget {
  readonly directionId: string | null;
  readonly layerId: string | null;
  readonly projectId: string;
  readonly shouldKeepTokens: boolean;
}

const isFieldReady = (input: HTMLInputElement | null): boolean =>
  input !== null && !input.disabled && input.closest("[inert]") === null;

const useScaleKey = (inputRef: RefObject<HTMLInputElement | null>): void => {
  const count = useLive(scaleFocusCount);
  const seen = useRef(count);

  useEffect(() => {
    const input = inputRef.current;

    if (seen.current === count) {
      return;
    }

    seen.current = count;

    if (input === null || !isFieldReady(input)) {
      return;
    }

    input.focus();
    input.select();
  }, [count, inputRef]);
};

const useScaleScrub = (
  draft: string,
  setDraft: (next: string) => void,
  commit: (text: string) => void
): Pick<
  ScaleField,
  "handleScrubDown" | "handleScrubMove" | "handleScrubUp"
> => {
  const start = useRef<ScrubStart | null>(null);
  const shown = useLatestRef(draft);

  const handleScrubDown = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      start.current = {
        percent: toScalePercent(shown.current) ?? FULL_PERCENT,
        x: event.clientX,
      };
    },
    [shown]
  );

  const handleScrubMove = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const from = start.current;

      if (from === null) {
        return;
      }

      setDraft(String(toScrubPercent(from.percent, event.clientX - from.x)));
    },
    [setDraft]
  );

  const handleScrubUp = useCallback(
    (event: PointerEvent<HTMLElement>) => {
      const from = start.current;

      start.current = null;

      if (from === null || event.clientX === from.x) {
        return;
      }

      commit(String(toScrubPercent(from.percent, event.clientX - from.x)));
    },
    [commit]
  );

  return { handleScrubDown, handleScrubMove, handleScrubUp };
};

const useScaleCommit = (
  target: ScaleTarget,
  setDraft: (next: string) => void
): ScaleCommit => {
  const [note, setNote] = useState<string | null>(null);
  const [isPending, startWork] = useTransition();
  const { run } = useAction(layerStyleRoutes.updateLayerStyle);
  const { directionId, layerId, projectId, shouldKeepTokens } = target;

  const commit = useCallback(
    (text: string): void => {
      const percent = toScalePercent(text);

      setDraft(FULL_TEXT);

      if (percent === null || percent === FULL_PERCENT || layerId === null) {
        return;
      }

      if (!isScaleInRange(percent)) {
        setNote(copy.scaleRange);

        return;
      }

      const factor = percent / FULL_PERCENT;

      startWork(async () => {
        const result = await run({
          directionId,
          factor,
          layerId,
          projectId,
          shouldKeepTokens,
        });

        if (result !== null) {
          setNote(toScaleNote(result, shouldKeepTokens));
        }
      });
    },
    [directionId, layerId, projectId, run, setDraft, shouldKeepTokens]
  );

  return { commit, isPending, note };
};

const useScaleField = (
  edit: DirectEdit,
  selection: SelectionContext
): ScaleField => {
  const [draft, setDraft] = useState(FULL_TEXT);
  const shouldKeepTokens = useLive(scaleKeepTokens);
  const inputRef = useRef<HTMLInputElement>(null);
  const layerId = toScaleLayerId(selection);

  const { commit, isPending, note } = useScaleCommit(
    { ...edit.scope, layerId, shouldKeepTokens },
    setDraft
  );

  useScaleKey(inputRef);

  const handleDraftInput = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setDraft(event.target.value.replaceAll("%", ""));
    },
    []
  );

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault();
        commit(event.currentTarget.value);
      }

      if (event.key === "Escape") {
        setDraft(FULL_TEXT);
        stopScaleMode();
      }
    },
    [commit]
  );

  const scrub = useScaleScrub(draft, setDraft, commit);

  return {
    ...scrub,
    draft,
    handleDraftInput,
    handleKeyDown,
    inputRef,
    isDisabled: layerId === null || isPending,
    note,
  };
};

export { useScaleField };

export type { ScaleField };
