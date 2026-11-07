import type {
  AnchorQuery,
  Direction,
  EditHistoryState,
  SelectionContext,
  Version,
} from "@design-studio/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import {
  anchorQueryOf,
  targetFromSelection,
} from "../../../shared/comments.js";
import { api, errorText } from "../../api.js";
import { useProjectEvents } from "../../platform/events.js";
import { historyKeyOf } from "../canvas/use-undo-shortcut.js";
import type { HistoryKind, RedoShortcut } from "../canvas/use-undo-shortcut.js";
import { historyPhrase } from "../versions-layers-tokens/version-labels.js";

export const PREVIEW_PAINTED_EVENT = "studio:preview-painted";

const EMPTY: EditHistoryState = {
  canRedo: false,
  canUndo: false,
  redoLabel: null,
  undoLabel: null,
};

const TOAST_MS = 2400;
const REFRESH_WINDOW_MS = 3000;
const SWAPPED_FRAME_RENDER_MS = 80;
const CHANGE_WINDOW_MS = 8000;
const CHANGE_RECHECK_MS = [500, 1500, 4000] as const;
const REPLAY_SLACK_MS = 1000;
const NOTHING_TO_UNDO = "Nothing more to undo";

type Describe = (
  anchors: AnchorQuery[]
) => Promise<(SelectionContext | null)[]>;

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

const HISTORY_STEP_TITLE = /^(Undo|Redo): /u;

export const isHistoryStep = (version: Version | undefined): boolean =>
  version !== undefined &&
  version.meta.kind === "manual" &&
  HISTORY_STEP_TITLE.test(version.title);

export const stepToast = (kind: HistoryKind, label: string | null): string => {
  const word = kind === "undo" ? "Undid" : "Redid";

  if (!label) {
    return kind === "undo" ? "Undid the last edit" : "Redid the edit";
  }

  const phrase = historyPhrase(label);

  if (phrase) {
    return `${word} ${phrase}`;
  }

  return `${word} ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
};

export const refreshedSelection = (
  prev: SelectionContext[],
  selectors: string[],
  contexts: (SelectionContext | null)[]
): SelectionContext[] =>
  prev.map((item) => {
    const context = contexts[selectors.indexOf(item.selector)];

    return context
      ? {
          ...item,
          rect: context.rect,
          source: context.source ?? item.source,
          styles: context.styles,
          text: context.text,
        }
      : item;
  });

export const useEditHistory = (o: Options) => {
  const { projectId, directionId } = o;
  const [state, setState] = useState<EditHistoryState>(EMPTY);
  const [toast, setToast] = useState<string | null>(null);
  const opts = useRef(o);
  opts.current = o;
  const stateRef = useRef(state);
  const queue = useRef<Promise<void>>(Promise.resolve());
  const generation = useRef(0);
  const toastTimer = useRef<number | undefined>(undefined);

  const apply = useCallback((next: EditHistoryState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const loading = useRef<{ readonly key: string } | null>(null);
  const reloadRequested = useRef(false);
  const mountedAt = useRef(Date.now());

  const load = useCallback(() => {
    if (!directionId) {
      return apply(EMPTY);
    }

    const key = `${projectId}/${directionId}`;

    if (loading.current?.key === key) {
      reloadRequested.current = true;

      return;
    }

    reloadRequested.current = false;
    const mine = { key };
    loading.current = mine;
    const started = generation.current;
    api
      .editHistory(projectId, directionId)
      .then((next) => {
        if (
          generation.current === started &&
          opts.current.directionId === directionId
        ) {
          apply(next);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (loading.current !== mine) {
          return;
        }

        loading.current = null;

        if (reloadRequested.current) {
          reloadRequested.current = false;
          load();
        }
      });
  }, [projectId, directionId, apply]);

  useEffect(load, [load]);
  useProjectEvents(projectId, (event) => {
    if (
      event.type === "edit-history.changed" &&
      event.ts >= mountedAt.current - REPLAY_SLACK_MS
    ) {
      load();
    }
  });
  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const showToast = useCallback((text: string) => {
    window.clearTimeout(toastTimer.current);
    setToast(text);
    toastTimer.current = window.setTimeout(() => setToast(null), TOAST_MS);
  }, []);

  const runStep = useCallback(
    async (kind: HistoryKind, fallback?: () => unknown) => {
      const cur = opts.current;

      if (!cur.directionId) {
        await fallback?.();

        return;
      }

      generation.current += 1;
      let known = stateRef.current;

      try {
        await cur.before();
        known = await api.editHistory(cur.projectId, cur.directionId);
        apply(known);

        if (!(kind === "undo" ? known.canUndo : known.canRedo)) {
          await fallback?.();

          return;
        }

        const result = await api.editHistoryStep(
          cur.projectId,
          cur.directionId,
          kind
        );

        apply(result.state);
        showToast(
          stepToast(kind, kind === "undo" ? known.undoLabel : known.redoLabel)
        );
        cur.onStepped(result.version);
      } catch (error) {
        cur.onError(errorText(error));
      } finally {
        generation.current += 1;
      }

      if (stateRef.current === known) {
        load();
      }
    },
    [apply, load, showToast]
  );

  const step = useCallback(
    (kind: HistoryKind, fallback?: () => unknown) => {
      queue.current = queue.current.then(() => runStep(kind, fallback));
    },
    [runStep]
  );

  const redo: RedoShortcut = {
    enabled: state.canRedo && !o.isLocked,
    onRedo: () => step("redo"),
  };

  const head = o.versions.find(
    (version) => version.id === o.direction?.headVersionId
  );

  const versionFallback = (fallback: () => void) =>
    isHistoryStep(head) ? () => showToast(NOTHING_TO_UNDO) : fallback;

  const undoChain = (canUndo: boolean, fallback: () => void) => ({
    canUndo: canUndo || (state.canUndo && !o.isLocked),
    onUndo: () => step("undo", versionFallback(fallback)),
  });

  return { redo, state, step, toast, undoChain };
};

interface RefreshWatch {
  readonly change: {
    readonly directionId: string;
    readonly changedAt: number;
  } | null;
  readonly directionId: string | null;
  readonly dropDrafts: () => void;
}

const isSameStyles = (
  a: Record<string, string>,
  b: Record<string, string>
): boolean => {
  const keys = Object.keys(a);

  return (
    keys.length === Object.keys(b).length &&
    keys.every((key) => a[key] === b[key])
  );
};

const hasStylesMoved = (
  prev: SelectionContext[],
  selectors: string[],
  contexts: (SelectionContext | null)[]
): boolean =>
  prev.some((item) => {
    const context = contexts[selectors.indexOf(item.selector)];

    return (
      context !== null &&
      context !== undefined &&
      !isSameStyles(context.styles, item.styles)
    );
  });

export const useSelectionRefresh = (
  selection: SelectionContext[],
  setSelection: Dispatch<SetStateAction<SelectionContext[]>>,
  describeRef: MutableRefObject<Describe | null>,
  watch: RefreshWatch
) => {
  const { change, directionId } = watch;
  const current = useRef(selection);
  current.current = selection;
  const dropDrafts = useRef(watch.dropDrafts);
  dropDrafts.current = watch.dropDrafts;
  const deadline = useRef(0);
  const timers = useRef(new Set<number>());

  const refresh = useCallback(() => {
    if (Date.now() > deadline.current || current.current.length === 0) {
      return;
    }

    const describe = describeRef.current;

    if (!describe) {
      setSelection([]);

      return;
    }

    const selectors = current.current.map((item) => item.selector);

    const queries = current.current.map((item, index) =>
      anchorQueryOf({ id: String(index), target: targetFromSelection(item) })
    );

    describe(queries)
      .then((contexts) => {
        if (Date.now() > deadline.current) {
          return;
        }

        if (hasStylesMoved(current.current, selectors, contexts)) {
          dropDrafts.current();
        }

        setSelection((prev) => refreshedSelection(prev, selectors, contexts));
      })
      .catch(() => undefined);
  }, [describeRef, setSelection]);

  const later = useCallback(
    (delays: readonly number[]) => {
      for (const ms of delays) {
        const id = window.setTimeout(() => {
          timers.current.delete(id);
          refresh();
        }, ms);

        timers.current.add(id);
      }
    },
    [refresh]
  );

  useEffect(() => {
    let paintQueued = false;

    const onPainted = () => {
      if (paintQueued || Date.now() > deadline.current) {
        return;
      }

      paintQueued = true;
      window.setTimeout(() => {
        paintQueued = false;
        refresh();
      }, SWAPPED_FRAME_RENDER_MS);
    };

    const onInput = (event: Event) => {
      if (event instanceof KeyboardEvent && historyKeyOf(event)) {
        return;
      }

      deadline.current = 0;
    };

    window.addEventListener(PREVIEW_PAINTED_EVENT, onPainted);
    window.addEventListener("keydown", onInput, true);
    window.addEventListener("pointerdown", onInput, true);

    return () => {
      window.removeEventListener(PREVIEW_PAINTED_EVENT, onPainted);
      window.removeEventListener("keydown", onInput, true);
      window.removeEventListener("pointerdown", onInput, true);
    };
  }, [refresh]);

  useEffect(() => {
    if (!change || change.directionId !== directionId) {
      return;
    }

    deadline.current = Math.max(
      deadline.current,
      Date.now() + CHANGE_WINDOW_MS
    );
    later(CHANGE_RECHECK_MS);
  }, [change, directionId, later]);

  useEffect(
    () => () => {
      for (const id of timers.current) {
        window.clearTimeout(id);
      }
    },
    []
  );

  return useCallback(
    (now: boolean) => {
      deadline.current = Date.now() + REFRESH_WINDOW_MS;

      if (now) {
        refresh();
      }
    },
    [refresh]
  );
};
