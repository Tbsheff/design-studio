import { useCallback, useEffect, useRef, useState } from 'react';
import type { SelectionContext } from '../shared/contracts';
import type { CommentsControl } from './useComments';
import { isTypingTarget } from './typingTarget';

type SetSelection = (updater: (prev: SelectionContext[]) => SelectionContext[]) => void;

function sameSelectors(prev: SelectionContext[], next: SelectionContext[]): boolean {
  return prev.length === next.length && prev.every((s, i) => s.selector === next[i]?.selector);
}

interface CommentMode {
  available: boolean;
  on: boolean;
  setOn: (on: boolean) => void;
  toggle: () => void;
  guard: (setSelection: SetSelection) => SetSelection;
}

export function useCommentMode(control: CommentsControl | undefined, live: boolean, setSelectMode: (on: boolean) => void): CommentMode {
  const [on, setOn] = useState(false);
  const available = Boolean(control) && live;
  const availableRef = useRef(available);
  availableRef.current = available;
  const repinId = control?.repinId ?? null;
  const setRepinId = control?.setRepinId;

  const toggle = useCallback(() => {
    setSelectMode(false);
    setOn((value) => !value);
  }, [setSelectMode]);

  useEffect(() => {
    if (!live) setOn(false);
  }, [live]);

  useEffect(() => {
    if (!repinId) return;
    setSelectMode(false);
    setOn(true);
  }, [repinId, setSelectMode]);

  useEffect(() => {
    if (!on && repinId) setRepinId?.(null);
  }, [on]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (isTypingTarget(event.target) || event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key.toLowerCase();
      if (key === 'c' && availableRef.current) {
        event.preventDefault();
        toggle();
      } else if (key === 'v' || key === 'escape') {
        setOn(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggle]);

  const guard = useCallback(
    (setSelection: SetSelection): SetSelection => {
      if (!on) return setSelection;
      return (updater) =>
        setSelection((prev) => {
          const next = updater(prev);
          return sameSelectors(prev, next) ? next : prev;
        });
    },
    [on],
  );

  return { available, on, setOn, toggle, guard };
}
