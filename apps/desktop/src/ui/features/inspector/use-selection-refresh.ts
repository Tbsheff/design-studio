import type { SelectionContext } from "@design-studio/contracts";
import { startTransition, useCallback, useEffect, useRef } from "react";
import type { Dispatch, MutableRefObject, SetStateAction } from "react";

import {
  anchorQueryOf,
  targetFromSelection,
} from "../../../shared/comments.js";
import { historyKeyOf } from "./deps.js";
import {
  PREVIEW_PAINTED_EVENT,
  toRefreshedSelection,
} from "./use-edit-history.js";
import { useLatestRef } from "./use-latest-ref.js";

const REFRESH_WINDOW_MS = 3000;
const SWAPPED_FRAME_RENDER_MS = 80;
const CHANGE_WINDOW_MS = 8000;
const RECHECK_FIRST_MS = 500;
const RECHECK_SECOND_MS = 1500;
const RECHECK_THIRD_MS = 4000;

const CHANGE_RECHECK_MS = [
  RECHECK_FIRST_MS,
  RECHECK_SECOND_MS,
  RECHECK_THIRD_MS,
] as const;

type Describe = (
  anchors: ReturnType<typeof anchorQueryOf>[]
) => Promise<(SelectionContext | null)[]>;

interface RefreshWatch {
  readonly change: {
    readonly directionId: string;
    readonly changedAt: number;
  } | null;
  readonly directionId: string | null;
  readonly dropDrafts: () => void;
}

const isSameStyles = (
  first: Record<string, string>,
  second: Record<string, string>
): boolean => {
  const keys = Object.keys(first);

  return (
    keys.length === Object.keys(second).length &&
    keys.every((key) => first[key] === second[key])
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
      (context ?? null) !== null &&
      !isSameStyles(context?.styles ?? {}, item.styles)
    );
  });

const inspectContexts = async (
  describe: Describe,
  queries: ReturnType<typeof anchorQueryOf>[]
): Promise<(SelectionContext | null)[] | null> => {
  try {
    return await describe(queries);
  } catch {
    return null;
  }
};

interface RefreshContext {
  readonly current: MutableRefObject<SelectionContext[]>;
  readonly deadline: MutableRefObject<number>;
  readonly describeRef: MutableRefObject<Describe | null>;
  readonly dropDrafts: MutableRefObject<() => void>;
  readonly setSelection: Dispatch<SetStateAction<SelectionContext[]>>;
}

const runRefresh = (ctx: RefreshContext): void => {
  const { current, deadline, describeRef, dropDrafts, setSelection } = ctx;

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

  startTransition(async () => {
    const contexts = await inspectContexts(describe, queries);

    if (contexts === null || Date.now() > deadline.current) {
      return;
    }

    if (hasStylesMoved(current.current, selectors, contexts)) {
      dropDrafts.current();
    }

    setSelection((prev) => toRefreshedSelection(prev, selectors, contexts));
  });
};

const usePaintListeners = (
  refresh: () => void,
  deadline: MutableRefObject<number>
): void => {
  useEffect(() => {
    let isPaintQueued = false;

    const onPainted = (): void => {
      if (isPaintQueued || Date.now() > deadline.current) {
        return;
      }

      isPaintQueued = true;
      globalThis.setTimeout(() => {
        isPaintQueued = false;
        refresh();
      }, SWAPPED_FRAME_RENDER_MS);
    };

    const onInput = (event: Event): void => {
      if (event instanceof KeyboardEvent && historyKeyOf(event)) {
        return;
      }

      deadline.current = 0;
    };

    globalThis.addEventListener(PREVIEW_PAINTED_EVENT, onPainted);
    globalThis.addEventListener("keydown", onInput, true);
    globalThis.addEventListener("pointerdown", onInput, true);

    return (): void => {
      globalThis.removeEventListener(PREVIEW_PAINTED_EVENT, onPainted);
      globalThis.removeEventListener("keydown", onInput, true);
      globalThis.removeEventListener("pointerdown", onInput, true);
    };
  }, [refresh, deadline]);
};

const setDeadline = (deadline: MutableRefObject<number>): void => {
  deadline.current = Math.max(deadline.current, Date.now() + CHANGE_WINDOW_MS);
};

const useChangeRecheck = (
  watch: RefreshWatch,
  deadline: MutableRefObject<number>,
  refresh: () => void
): void => {
  const { change, directionId } = watch;
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());

  useEffect(() => {
    if (!change || change.directionId !== directionId) {
      return;
    }

    setDeadline(deadline);

    for (const ms of CHANGE_RECHECK_MS) {
      const id = globalThis.setTimeout(() => {
        timers.current.delete(id);
        refresh();
      }, ms);

      timers.current.add(id);
    }
  }, [change, directionId, deadline, refresh]);

  useEffect(
    () => (): void => {
      for (const id of timers.current) {
        globalThis.clearTimeout(id);
      }
    },
    []
  );
};

const useSelectionRefresh = (
  selection: SelectionContext[],
  setSelection: Dispatch<SetStateAction<SelectionContext[]>>,
  describeRef: MutableRefObject<Describe | null>,
  watch: RefreshWatch
): ((now: boolean) => void) => {
  const current = useLatestRef(selection);
  const dropDrafts = useLatestRef(watch.dropDrafts);
  const deadline = useRef(0);

  const refresh = useCallback(
    () =>
      runRefresh({ current, deadline, describeRef, dropDrafts, setSelection }),
    [current, describeRef, dropDrafts, setSelection]
  );

  usePaintListeners(refresh, deadline);
  useChangeRecheck(watch, deadline, refresh);

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

export { useSelectionRefresh };
