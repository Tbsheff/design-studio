import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { EditSessionEnd } from '../shared/contracts';
import { api, errorText } from './api';
import type { PreviewPort } from './bridge';
import { useProjectEvents } from './events';
import type { DirectEditControl } from './useDirectEdit';

export type SessionAction = 'save' | 'discard';

export interface EditSessionHandle {
  dirty: boolean;
  count: number;
  requestExit: () => Promise<boolean>;
  save: () => Promise<boolean>;
  discard: () => Promise<boolean>;
}

interface Options {
  projectId: string;
  directionId: string | null;
  control: MutableRefObject<DirectEditControl | null>;
  port: MutableRefObject<PreviewPort | null>;
  onEnded?: (action: SessionAction, result: EditSessionEnd) => void;
}

interface SessionView {
  base: string | null;
  count: number;
  dirty: boolean;
  blocked: string | null;
}

const EMPTY: SessionView = { base: null, count: 0, dirty: false, blocked: null };
const REFRESH_MS = 120;

export function unsavedLabel(count: number): string {
  if (count === 0) return 'No unsaved edits';
  return count === 1 ? '1 unsaved edit' : `${count} unsaved edits`;
}

export function useEditSession(o: Options) {
  const { projectId, directionId } = o;
  const [view, setView] = useState<SessionView>(EMPTY);
  const [busy, setBusy] = useState<SessionAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const viewRef = useRef(view);
  viewRef.current = view;
  const opts = useRef(o);
  opts.current = o;
  const timer = useRef<number | undefined>(undefined);
  const exitResolve = useRef<((leave: boolean) => void) | null>(null);

  const begin = useCallback(() => {
    if (!directionId) return setView(EMPTY);
    api
      .editSession(projectId, directionId)
      .then((state) => opts.current.directionId === directionId && setView({ base: state.baseVersionId || null, count: 0, dirty: false, blocked: null }))
      .catch((err: unknown) => setError(errorText(err)));
  }, [projectId, directionId]);

  useEffect(begin, [begin]);

  const refresh = useCallback(() => {
    const base = viewRef.current.base;
    if (!directionId || !base) return;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      api
        .editSession(projectId, directionId, base)
        .then((state) => {
          if (viewRef.current.base === base) setView({ base, count: state.count, dirty: state.dirty, blocked: state.blocked });
        })
        .catch(() => undefined);
    }, REFRESH_MS);
  }, [projectId, directionId]);

  useEffect(() => () => window.clearTimeout(timer.current), []);
  useProjectEvents(projectId, (event) => {
    if (event.directionId !== undefined && event.directionId !== directionId) return;
    if (event.type === 'edit-history.changed' || event.type === 'version.created') refresh();
  });

  const end = useCallback(
    async (action: SessionAction): Promise<boolean> => {
      const cur = opts.current;
      const base = viewRef.current.base;
      if (!cur.directionId || !base) return true;
      setBusy(action);
      setError(null);
      try {
        await cur.control.current?.settle();
        if (action === 'discard') cur.port.current?.post({ type: 'preview-reset' });
        const result = await api.endEditSession(cur.projectId, cur.directionId, action, base);
        setView({ base: result.headVersionId, count: 0, dirty: false, blocked: null });
        cur.onEnded?.(action, result);
        return true;
      } catch (err) {
        setError(errorText(err));
        return false;
      } finally {
        setBusy(null);
      }
    },
    [],
  );

  const close = useCallback((leave: boolean) => {
    setAsking(false);
    exitResolve.current?.(leave);
    exitResolve.current = null;
  }, []);

  const requestExit = useCallback((): Promise<boolean> => {
    if (viewRef.current.count === 0) return Promise.resolve(true);
    if (!viewRef.current.dirty) return end('save');
    exitResolve.current?.(false);
    setAsking(true);
    return new Promise<boolean>((resolve) => {
      exitResolve.current = resolve;
    });
  }, [end]);

  const answer = useCallback(
    async (choice: SessionAction | 'cancel') => {
      if (choice === 'cancel') return close(false);
      const ok = await end(choice);
      if (ok) close(true);
    },
    [end, close],
  );

  const save = useCallback(() => end('save'), [end]);
  const discard = useCallback(() => end('discard'), [end]);

  return { ...view, busy, error, asking, save, discard, requestExit, answer, clearError: () => setError(null) };
}

export type EditSession = ReturnType<typeof useEditSession>;
