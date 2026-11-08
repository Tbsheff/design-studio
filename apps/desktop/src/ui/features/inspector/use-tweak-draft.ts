import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";

import { tweaksPreviewCss } from "../../../shared/tweaks.js";
import type {
  TweakControl,
  TweaksState,
  TweakValue,
} from "../../../shared/tweaks.js";

type TweakMap = Record<string, TweakValue>;

interface Step {
  readonly id: string;
  readonly before: TweakValue | null;
}

interface UseTweakDraftResult {
  readonly apply: (next: TweakMap) => void;
  readonly clearDraft: () => void;
  readonly commitError: string | null;
  readonly discard: () => void;
  readonly edit: (control: TweakControl, value: TweakValue) => void;
  readonly pending: TweakMap;
  readonly pendingRef: RefObject<TweakMap>;
  readonly revert: (id: string) => void;
  readonly setCommitError: (message: string | null) => void;
  readonly stopPreview: () => void;
  readonly undoLast: () => void;
}

const toBaseValue = (
  state: TweaksState | null,
  control: TweakControl
): TweakValue => state?.current[control.id] ?? control.default;

const toWithout = (map: TweakMap, id: string): TweakMap =>
  Object.fromEntries(Object.entries(map).filter(([key]) => key !== id));

const toWith = (map: TweakMap, id: string, value: TweakValue): TweakMap =>
  Object.fromEntries([...Object.entries(map), [id, value]]);

interface TweakEdits {
  readonly clearHistory: () => void;
  readonly edit: (control: TweakControl, value: TweakValue) => void;
  readonly revert: (id: string) => void;
  readonly undoLast: () => void;
}

const useTweakEdits = (
  stateRef: RefObject<TweaksState | null>,
  pendingRef: RefObject<TweakMap>,
  apply: (next: TweakMap) => void
): TweakEdits => {
  const history = useRef<Step[]>([]);

  const edit = useCallback(
    (control: TweakControl, value: TweakValue) => {
      const map = pendingRef.current;
      const last = history.current.at(-1);

      if (!last || last.id !== control.id) {
        history.current.push({
          before: map[control.id] ?? null,
          id: control.id,
        });
      }

      if (value === toBaseValue(stateRef.current, control)) {
        apply(toWithout(map, control.id));

        return;
      }

      apply(toWith(map, control.id, value));
    },
    [apply, stateRef, pendingRef]
  );

  const revert = useCallback(
    (id: string) => {
      history.current = history.current.filter((step) => step.id !== id);
      apply(toWithout(pendingRef.current, id));
    },
    [apply, pendingRef]
  );

  const undoLast = useCallback(() => {
    const step = history.current.pop();

    if (!step) {
      return;
    }

    if (step.before === null) {
      apply(toWithout(pendingRef.current, step.id));

      return;
    }

    apply(toWith(pendingRef.current, step.id, step.before));
  }, [apply, pendingRef]);

  const clearHistory = useCallback(() => {
    history.current = [];
  }, []);

  return { clearHistory, edit, revert, undoLast };
};

interface TweakPreview {
  readonly schedulePreview: () => void;
  readonly stopPreview: () => void;
}

const usePreviewFrame = (
  stateRef: RefObject<TweaksState | null>,
  pendingRef: RefObject<TweakMap>,
  broadcast: (css: string) => void
): TweakPreview => {
  const frame = useRef<number | null>(null);

  const stopPreview = useCallback(() => {
    if (frame.current !== null) {
      globalThis.cancelAnimationFrame(frame.current);
    }

    frame.current = null;
  }, []);

  const schedulePreview = useCallback(() => {
    if (frame.current !== null) {
      return;
    }

    frame.current = globalThis.requestAnimationFrame(() => {
      frame.current = null;
      broadcast(
        tweaksPreviewCss(stateRef.current?.controls ?? [], pendingRef.current)
      );
    });
  }, [stateRef, pendingRef, broadcast]);

  return { schedulePreview, stopPreview };
};

const useTweakDraft = (
  stateRef: RefObject<TweaksState | null>,
  broadcast: (css: string) => void,
  scope: string
): UseTweakDraftResult => {
  const [pending, setPending] = useState<TweakMap>({});
  const [commitError, setCommitError] = useState<string | null>(null);
  const pendingRef = useRef<TweakMap>({});

  const { schedulePreview, stopPreview } = usePreviewFrame(
    stateRef,
    pendingRef,
    broadcast
  );

  const apply = useCallback(
    (next: TweakMap) => {
      pendingRef.current = next;
      setPending(next);
      setCommitError(null);
      schedulePreview();
    },
    [schedulePreview]
  );

  const { clearHistory, edit, revert, undoLast } = useTweakEdits(
    stateRef,
    pendingRef,
    apply
  );

  const clearDraft = useCallback(() => {
    stopPreview();
    clearHistory();
    pendingRef.current = {};
    setPending({});
    setCommitError(null);
  }, [stopPreview, clearHistory]);

  const discard = useCallback(() => {
    clearDraft();
    broadcast("");
  }, [clearDraft, broadcast]);

  useEffect(() => {
    const owner = scope;

    return (): void => {
      if (owner.length > 0) {
        discard();
      }
    };
  }, [scope, discard]);

  return {
    apply,
    clearDraft,
    commitError,
    discard,
    edit,
    pending,
    pendingRef,
    revert,
    setCommitError,
    stopPreview,
    undoLast,
  };
};

export { toBaseValue, useTweakDraft };

export type { TweakMap };
