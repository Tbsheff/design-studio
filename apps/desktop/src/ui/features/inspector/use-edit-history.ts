import type {
  Direction,
  EditHistoryState,
  SelectionContext,
  Version,
} from "@design-studio/contracts";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MutableRefObject, RefObject } from "react";

import { api, errorText } from "../../api.js";
import { useProjectEvents } from "../../platform/events.js";
import type { HistoryKind, RedoShortcut } from "../canvas/use-undo-shortcut.js";
import { historyPhrase } from "../versions-layers-tokens/version-labels.js";
import { stopTimer } from "./timer-model.js";
import type { TimerRef } from "./timer-model.js";
import { useLatestRef } from "./use-latest-ref.js";

const PREVIEW_PAINTED_EVENT = "studio:preview-painted";

const EMPTY: EditHistoryState = {
  canRedo: false,
  canUndo: false,
  redoLabel: null,
  undoLabel: null,
};

const TOAST_MS = 2400;
const REPLAY_SLACK_MS = 1000;
const NOTHING_TO_UNDO = "Nothing more to undo";

type HistoryFallback = (() => void | Promise<void>) | null;

interface Options {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly direction: Direction | null;
  readonly versions: Version[];
  readonly isLocked: boolean;
  readonly before: () => Promise<void>;
  readonly onStepped: (version: Version) => void;
  readonly onError: (message: string) => void;
}

const HISTORY_STEP_TITLE = /^(?:Undo|Redo): /u;

const isHistoryStep = (version: Version | null): boolean =>
  version !== null &&
  version.meta.kind === "manual" &&
  HISTORY_STEP_TITLE.test(version.title);

const toStepWord = (kind: HistoryKind): string => {
  if (kind === "undo") {
    return "Undid";
  }

  return "Redid";
};

const toStepToast = (kind: HistoryKind, label: string | null): string => {
  const word = toStepWord(kind);

  if (!label) {
    if (kind === "undo") {
      return "Undid the last edit";
    }

    return "Redid the edit";
  }

  const phrase = historyPhrase(label);

  if (phrase) {
    return `${word} ${phrase}`;
  }

  return `${word} ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
};

const toRefreshedItem = (
  item: SelectionContext,
  context: SelectionContext | null
): SelectionContext => {
  if (!context) {
    return item;
  }

  return {
    ...item,
    rect: context.rect,
    source: context.source ?? item.source,
    styles: context.styles,
    text: context.text,
  };
};

const toRefreshedSelection = (
  prev: SelectionContext[],
  selectors: string[],
  contexts: (SelectionContext | null)[]
): SelectionContext[] =>
  prev.map((item) =>
    toRefreshedItem(item, contexts[selectors.indexOf(item.selector)] ?? null)
  );

interface UndoChain {
  readonly canUndo: boolean;
  readonly onUndo: () => void;
}

interface UseEditHistoryResult {
  readonly redo: RedoShortcut;
  readonly state: EditHistoryState;
  readonly step: (kind: HistoryKind, fallback: HistoryFallback) => void;
  readonly toast: string | null;
  readonly undoChain: (canUndo: boolean, fallback: () => void) => UndoChain;
}

interface StepContext {
  readonly latest: RefObject<Options>;
  readonly stateRef: MutableRefObject<EditHistoryState>;
  readonly generation: MutableRefObject<number>;
  readonly apply: (next: EditHistoryState) => void;
  readonly load: () => void;
  readonly showToast: (text: string) => void;
}

const getHistory = async (
  projectId: string,
  directionId: string
): Promise<EditHistoryState | null> => {
  try {
    return await api.editHistory(projectId, directionId);
  } catch {
    return null;
  }
};

const canStep = (known: EditHistoryState, kind: HistoryKind): boolean => {
  if (kind === "undo") {
    return known.canUndo;
  }

  return known.canRedo;
};

const toStepLabel = (
  known: EditHistoryState,
  kind: HistoryKind
): string | null => {
  if (kind === "undo") {
    return known.undoLabel;
  }

  return known.redoLabel;
};

const runStepAttempt = async (
  ctx: StepContext,
  directionId: string,
  kind: HistoryKind,
  fallback: HistoryFallback
): Promise<EditHistoryState | null> => {
  const cur = ctx.latest.current;
  let known = ctx.stateRef.current;

  try {
    await cur.before();
    known = await api.editHistory(cur.projectId, directionId);
    ctx.apply(known);

    if (!canStep(known, kind)) {
      await fallback?.();

      return null;
    }

    const result = await api.editHistoryStep(cur.projectId, directionId, kind);

    ctx.apply(result.state);
    ctx.showToast(toStepToast(kind, toStepLabel(known, kind)));
    cur.onStepped(result.version);
  } catch (error) {
    cur.onError(errorText(error));
  }

  return known;
};

const runHistoryStep = async (
  ctx: StepContext,
  kind: HistoryKind,
  fallback: HistoryFallback
): Promise<void> => {
  const { directionId } = ctx.latest.current;

  if (!directionId) {
    await fallback?.();

    return;
  }

  ctx.generation.current += 1;

  const known = await runStepAttempt(ctx, directionId, kind, fallback);

  ctx.generation.current += 1;

  if (known !== null && ctx.stateRef.current === known) {
    ctx.load();
  }
};

const runStepAfter = async (
  previous: Promise<void>,
  ctx: StepContext,
  kind: HistoryKind,
  fallback: HistoryFallback
): Promise<void> => {
  await previous;
  await runHistoryStep(ctx, kind, fallback);
};

const useToast = (): readonly [string | null, (text: string) => void] => {
  const [toast, setToast] = useState<string | null>(null);
  const timer: TimerRef = useRef(null);

  const showToast = useCallback((text: string) => {
    stopTimer(timer);
    setToast(text);
    timer.current = globalThis.setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  useEffect(
    () => (): void => {
      stopTimer(timer);
    },
    []
  );

  return [toast, showToast];
};

interface LoadContext {
  readonly latest: RefObject<Options>;
  readonly generation: MutableRefObject<number>;
  readonly apply: (next: EditHistoryState) => void;
}

const useHistoryLoad = (ctx: LoadContext): (() => void) => {
  const { projectId, directionId } = ctx.latest.current;
  const { apply, generation, latest } = ctx;
  const loading = useRef<{ readonly key: string } | null>(null);
  const isReloadRequested = useRef(false);
  const again = useRef<(() => void) | null>(null);
  const mountedAt = useRef(0);

  const load = useCallback(() => {
    if (!directionId) {
      apply(EMPTY);

      return;
    }

    const key = `${projectId}/${directionId}`;

    if (loading.current?.key === key) {
      isReloadRequested.current = true;

      return;
    }

    isReloadRequested.current = false;

    const mine = { key };
    loading.current = mine;

    const started = generation.current;
    startTransition(async () => {
      const next = await getHistory(projectId, directionId);

      if (
        next !== null &&
        generation.current === started &&
        latest.current.directionId === directionId
      ) {
        apply(next);
      }

      if (loading.current !== mine) {
        return;
      }

      loading.current = null;

      if (isReloadRequested.current) {
        isReloadRequested.current = false;
        again.current?.();
      }
    });
  }, [projectId, directionId, apply, generation, latest]);

  useEffect(() => {
    mountedAt.current = Date.now();
  }, []);

  useEffect(() => {
    again.current = load;
    load();
  }, [load]);

  useProjectEvents(projectId, (event) => {
    if (
      event.type === "edit-history.changed" &&
      event.ts >= mountedAt.current - REPLAY_SLACK_MS
    ) {
      load();
    }
  });

  return load;
};

const toUndoFallback = (
  isStep: boolean,
  fallback: () => void,
  showToast: (text: string) => void
): (() => void) => {
  if (isStep) {
    return (): void => showToast(NOTHING_TO_UNDO);
  }

  return fallback;
};

const useEditHistory = (options: Options): UseEditHistoryResult => {
  const [state, setState] = useState<EditHistoryState>(EMPTY);
  const [toast, showToast] = useToast();
  const latest = useLatestRef(options);
  const stateRef = useRef(state);
  const queue = useRef<Promise<void> | null>(null);
  const generation = useRef(0);

  const apply = useCallback((next: EditHistoryState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const load = useHistoryLoad({ apply, generation, latest });

  const ctx = useMemo(
    () => ({ apply, generation, latest, load, showToast, stateRef }),
    [apply, load, showToast, latest]
  );

  const step = useCallback(
    (kind: HistoryKind, fallback: HistoryFallback) => {
      queue.current = runStepAfter(
        queue.current ?? Promise.resolve(),
        ctx,
        kind,
        fallback
      );
    },
    [ctx]
  );

  const redo: RedoShortcut = {
    enabled: state.canRedo && !options.isLocked,
    onRedo: () => step("redo", null),
  };

  const head =
    options.versions.find(
      (version) => version.id === options.direction?.headVersionId
    ) ?? null;

  const undoChain = (canUndo: boolean, fallback: () => void): UndoChain => ({
    canUndo: canUndo || (state.canUndo && !options.isLocked),
    onUndo: () =>
      step("undo", toUndoFallback(isHistoryStep(head), fallback, showToast)),
  });

  return { redo, state, step, toast, undoChain };
};

export {
  PREVIEW_PAINTED_EVENT,
  isHistoryStep,
  toStepToast,
  toRefreshedSelection,
  useEditHistory,
};
