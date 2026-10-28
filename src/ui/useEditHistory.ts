import { useCallback, useEffect, useRef, useState, type Dispatch, type MutableRefObject, type SetStateAction } from 'react';
import { anchorQueryOf, targetFromSelection } from '../shared/comments';
import type { AnchorQuery, Direction, EditHistoryState, SelectionContext, Version } from '../shared/contracts';
import { api, errorText } from './api';
import { useProjectEvents } from './events';
import { historyKeyOf, type HistoryKind, type RedoShortcut } from './useUndoShortcut';

export const PREVIEW_PAINTED_EVENT = 'studio:preview-painted';

const EMPTY: EditHistoryState = { canUndo: false, canRedo: false, undoLabel: null, redoLabel: null };
const TOAST_MS = 2400;
const REFRESH_WINDOW_MS = 3000;
const NOTHING_TO_UNDO = 'Nothing more to undo';

type Describe = (anchors: AnchorQuery[]) => Promise<(SelectionContext | null)[]>;

interface Options {
  projectId: string;
  directionId: string | null;
  direction: Direction | null;
  versions: Version[];
  locked: boolean;
  before: () => Promise<void>;
  onStepped: (version: Version) => void;
  onError: (message: string) => void;
}

const HISTORY_STEP_TITLE = /^(Undo|Redo): /;

export function isHistoryStep(version: Version | undefined): boolean {
  return version !== undefined && version.meta.kind === 'manual' && HISTORY_STEP_TITLE.test(version.title);
}

export function stepToast(kind: HistoryKind, label: string | null): string {
  const word = kind === 'undo' ? 'Undid' : 'Redid';
  if (!label) return kind === 'undo' ? 'Undid the last edit' : 'Redid the edit';
  return `${word} ${label.charAt(0).toLowerCase()}${label.slice(1)}`;
}

export function refreshedSelection(prev: SelectionContext[], selectors: string[], contexts: (SelectionContext | null)[]): SelectionContext[] {
  return prev.map((item) => {
    const context = contexts[selectors.indexOf(item.selector)];
    return context ? { ...item, styles: context.styles, text: context.text, rect: context.rect, source: context.source ?? item.source } : item;
  });
}

export function useEditHistory(o: Options) {
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

  const load = useCallback(() => {
    if (!directionId) return apply(EMPTY);
    const started = generation.current;
    api
      .editHistory(projectId, directionId)
      .then((next) => {
        if (generation.current === started && opts.current.directionId === directionId) apply(next);
      })
      .catch(() => undefined);
  }, [projectId, directionId, apply]);

  useEffect(load, [load]);
  useProjectEvents(projectId, (event) => {
    if (event.type === 'edit-history.changed') load();
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
        if (!(kind === 'undo' ? known.canUndo : known.canRedo)) {
          await fallback?.();
          return;
        }
        const result = await api.editHistoryStep(cur.projectId, cur.directionId, kind);
        apply(result.state);
        showToast(stepToast(kind, kind === 'undo' ? known.undoLabel : known.redoLabel));
        cur.onStepped(result.version);
      } catch (err) {
        cur.onError(errorText(err));
      } finally {
        generation.current += 1;
      }
      if (stateRef.current === known) load();
    },
    [apply, load, showToast],
  );

  const step = useCallback(
    (kind: HistoryKind, fallback?: () => unknown) => {
      queue.current = queue.current.then(() => runStep(kind, fallback));
    },
    [runStep],
  );

  const redo: RedoShortcut = { enabled: state.canRedo && !o.locked, onRedo: () => step('redo') };
  const head = o.versions.find((version) => version.id === o.direction?.headVersionId);
  const versionFallback = (fallback: () => void) => (isHistoryStep(head) ? () => showToast(NOTHING_TO_UNDO) : fallback);
  const undoChain = (canUndo: boolean, fallback: () => void) => ({
    canUndo: canUndo || (state.canUndo && !o.locked),
    onUndo: () => step('undo', versionFallback(fallback)),
  });
  return { state, toast, step, undoChain, redo };
}

export function useSelectionRefresh(selection: SelectionContext[], setSelection: Dispatch<SetStateAction<SelectionContext[]>>, describeRef: MutableRefObject<Describe | null>) {
  const current = useRef(selection);
  current.current = selection;
  const deadline = useRef(0);

  const refresh = useCallback(() => {
    if (Date.now() > deadline.current || current.current.length === 0) return;
    const describe = describeRef.current;
    if (!describe) {
      setSelection([]);
      return;
    }
    const selectors = current.current.map((item) => item.selector);
    const queries = current.current.map((item, index) => anchorQueryOf({ id: String(index), target: targetFromSelection(item) }));
    describe(queries)
      .then((contexts) => setSelection((prev) => refreshedSelection(prev, selectors, contexts)))
      .catch(() => undefined);
  }, [describeRef, setSelection]);

  useEffect(() => {
    const onPainted = () => refresh();
    const onInput = (event: Event) => {
      if (event instanceof KeyboardEvent && historyKeyOf(event)) return;
      deadline.current = 0;
    };
    window.addEventListener(PREVIEW_PAINTED_EVENT, onPainted);
    window.addEventListener('keydown', onInput, true);
    window.addEventListener('pointerdown', onInput, true);
    return () => {
      window.removeEventListener(PREVIEW_PAINTED_EVENT, onPainted);
      window.removeEventListener('keydown', onInput, true);
      window.removeEventListener('pointerdown', onInput, true);
    };
  }, [refresh]);

  return useCallback(
    (now: boolean) => {
      deadline.current = Date.now() + REFRESH_WINDOW_MS;
      if (now) refresh();
    },
    [refresh],
  );
}
