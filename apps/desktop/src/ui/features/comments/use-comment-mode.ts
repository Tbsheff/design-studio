import { useCallback, useEffect, useRef, useState } from "react";

import type { SelectionContext } from "./deps.js";
import { useCommentKeys } from "./use-comment-keys.js";
import type { CommentsControl } from "./use-comments.js";

type SetSelection = (
  updater: (prev: SelectionContext[]) => SelectionContext[]
) => void;

const sameSelectors = (
  prev: SelectionContext[],
  next: SelectionContext[]
): boolean =>
  prev.length === next.length &&
  prev.every(
    (selectionContext, index) =>
      selectionContext.selector === next[index]?.selector
  );

const toGuardedSelection = (
  prev: SelectionContext[],
  next: SelectionContext[]
): SelectionContext[] => {
  if (sameSelectors(prev, next)) {
    return next;
  }

  return prev;
};

interface CommentMode {
  available: boolean;
  on: boolean;
  setOn: (on: boolean) => void;
  toggle: () => void;
  guard: (setSelection: SetSelection) => SetSelection;
}

const useCommentMode = (
  control: CommentsControl | undefined,
  live: boolean,
  setSelectMode: (on: boolean) => void
): CommentMode => {
  const [on, setOn] = useState(false);
  const available = Boolean(control) && live;
  const availableRef = useRef(available);

  useEffect(() => {
    availableRef.current = available;
  }, [available]);

  const repinId = control?.repinId ?? null;
  const setRepinId = control?.setRepinId;

  const toggle = useCallback(() => {
    setSelectMode(false);
    setOn((value) => !value);
  }, [setSelectMode]);

  useEffect(() => {
    if (!live) {
      setOn(false);
    }
  }, [live]);

  useEffect(() => {
    if (!repinId) {
      return;
    }

    setSelectMode(false);
    setOn(true);
  }, [repinId, setSelectMode]);

  useEffect(() => {
    if (!on && repinId) {
      setRepinId?.(null);
    }
  }, [on]);

  useCommentKeys(availableRef, toggle, setOn);

  const guard = useCallback(
    (setSelection: SetSelection): SetSelection => {
      if (!on) {
        return setSelection;
      }

      return (updater) =>
        setSelection((prev) => toGuardedSelection(prev, updater(prev)));
    },
    [on]
  );

  return { available, guard, on, setOn, toggle };
};

export { useCommentMode };

export type { CommentMode };
