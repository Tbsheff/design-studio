import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Project, RunRequest, Version } from '../shared/contracts';
import { tweaksPreviewCss, type TweakControl, type TweaksState, type TweakValue } from '../shared/tweaks';
import { ApiError, api, errorText } from './api';
import { broadcastTweakCss, holdTweakCssUntilReload } from './tokenFrames';
import { AGENT_BUSY_MESSAGE } from './useTokenDraft';
import type { FilesChange } from './useStudioData';

type TweakMap = Record<string, TweakValue>;

export const TWEAKS_REQUEST: RunRequest = {
  prompt: 'Suggest tweaks for this design: add 3 to 8 live controls (spacing, accent color, radius, density, font size, a layout toggle) bound to CSS variables. Keep the look the same at the default values.',
  mode: 'edit',
  task: 'tweaks',
};

interface Step {
  id: string;
  before: TweakValue | undefined;
}

interface Options {
  projectId: string;
  project: Project | null;
  directionId: string | null;
  lastChange: FilesChange | null;
  onCommitted: (version: Version) => void;
}

function changeStamp(change: FilesChange | null, directionId: string | null): number {
  return change && change.directionId === directionId ? change.receivedAt : 0;
}

function baseValue(state: TweaksState | null, control: TweakControl): TweakValue {
  return state?.current[control.id] ?? control.default;
}

function useTweaksState(o: Options) {
  const [loaded, setLoaded] = useState<{ key: string; state: TweaksState } | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const headVersionId = o.project?.directions.find((x) => x.id === o.directionId)?.headVersionId ?? null;
  const stamp = changeStamp(o.lastChange, o.directionId);
  const key = `${o.projectId}:${o.directionId}`;
  const live = useRef(key);
  live.current = key;

  useEffect(() => {
    const directionId = o.directionId;
    if (!directionId) return;
    const want = `${o.projectId}:${directionId}`;
    api
      .getTweaks(o.projectId, directionId)
      .then((state) => {
        if (live.current !== want) return;
        setLoaded({ key: want, state });
        setLoadError(null);
      })
      .catch((err: unknown) => live.current === want && setLoadError(errorText(err)));
  }, [o.projectId, o.directionId, headVersionId, stamp]);

  const replace = useCallback((state: TweaksState) => setLoaded({ key: live.current, state }), []);
  const state = loaded?.key === key ? loaded.state : null;
  return { state, loadError, replace };
}

export function useTweaks(o: Options) {
  const { state, loadError, replace } = useTweaksState(o);
  const [pending, setPendingMap] = useState<TweakMap>({});
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const history = useRef<Step[]>([]);
  const frame = useRef<number | null>(null);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const stateRef = useRef(state);
  stateRef.current = state;
  const opts = useRef(o);
  opts.current = o;

  const stopPreview = useCallback(() => {
    if (frame.current !== null) window.cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);

  const schedulePreview = useCallback(() => {
    if (frame.current !== null) return;
    frame.current = window.requestAnimationFrame(() => {
      frame.current = null;
      broadcastTweakCss(tweaksPreviewCss(stateRef.current?.controls ?? [], pendingRef.current));
    });
  }, []);

  const clearDraft = useCallback(() => {
    stopPreview();
    history.current = [];
    pendingRef.current = {};
    setPendingMap({});
    setCommitError(null);
  }, [stopPreview]);

  const discard = useCallback(() => {
    clearDraft();
    broadcastTweakCss('');
  }, [clearDraft]);

  const scope = `${o.projectId}:${o.directionId}`;
  useEffect(() => discard, [scope, discard]);

  const apply = useCallback(
    (next: TweakMap) => {
      pendingRef.current = next;
      setPendingMap(next);
      setCommitError(null);
      schedulePreview();
    },
    [schedulePreview],
  );

  const edit = useCallback(
    (control: TweakControl, value: TweakValue) => {
      const map = pendingRef.current;
      const last = history.current[history.current.length - 1];
      if (!last || last.id !== control.id) history.current.push({ id: control.id, before: map[control.id] });
      const next = { ...map };
      if (value === baseValue(stateRef.current, control)) delete next[control.id];
      else next[control.id] = value;
      apply(next);
    },
    [apply],
  );

  const revert = useCallback(
    (id: string) => {
      history.current = history.current.filter((step) => step.id !== id);
      const next = { ...pendingRef.current };
      delete next[id];
      apply(next);
    },
    [apply],
  );

  const undoLast = useCallback(() => {
    const step = history.current.pop();
    if (!step) return;
    const next = { ...pendingRef.current };
    if (step.before === undefined) delete next[step.id];
    else next[step.id] = step.before;
    apply(next);
  }, [apply]);

  const commit = useCallback(async () => {
    const { projectId, directionId } = opts.current;
    const values = pendingRef.current;
    if (!directionId || Object.keys(values).length === 0) return;
    stopPreview();
    broadcastTweakCss(tweaksPreviewCss(stateRef.current?.controls ?? [], values));
    setCommitting(true);
    setCommitError(null);
    try {
      const result = await api.commitTweaks(projectId, directionId, values);
      replace(result.state);
      clearDraft();
      holdTweakCssUntilReload();
      opts.current.onCommitted(result.version);
    } catch (err) {
      setCommitError(err instanceof ApiError && err.status === 409 ? AGENT_BUSY_MESSAGE : errorText(err));
    } finally {
      setCommitting(false);
    }
  }, [clearDraft, replace, stopPreview]);

  const confirmLeave = useCallback(() => {
    const count = Object.keys(pendingRef.current).length;
    if (count === 0) return true;
    const ok = window.confirm(`Discard ${count} tweak ${count === 1 ? 'change' : 'changes'}?`);
    if (ok) discard();
    return ok;
  }, [discard]);

  const count = Object.keys(pending).length;
  const undoChain = (canUndo: boolean, fallback: () => void) => ({
    canUndo: canUndo || count > 0,
    onUndo: () => (Object.keys(pendingRef.current).length > 0 ? undoLast() : fallback()),
  });
  const values = useMemo(() => {
    const out: TweakMap = {};
    for (const control of state?.controls ?? []) out[control.id] = pending[control.id] ?? baseValue(state, control);
    return out;
  }, [state, pending]);

  return { state, loadError, pending, values, count, committing, commitError, edit, revert, undoLast, undoChain, discard, commit, confirmLeave };
}

export type TweaksDraft = ReturnType<typeof useTweaks>;
