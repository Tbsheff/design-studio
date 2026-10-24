import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import type { DirectStyleProperty, SelectionContext } from '../shared/contracts';
import { ApiError, api, errorText } from './api';
import type { PreviewPort } from './bridge';
import { changedProps, valuesFromStyles, type StyleValues } from './cssValues';
import { batchEdits, mergeValues, multiBlockReason } from './mixedValues';
import type { DirectEdit, DirectEditCommit, DirectEditControl, SaveStatus } from './useDirectEdit';

interface Options {
  projectId: string;
  directionId: string | null;
  selections: SelectionContext[];
  port: MutableRefObject<PreviewPort | null>;
  control: MutableRefObject<DirectEditControl | null>;
  onCommitted: (commit: DirectEditCommit) => void;
  onStale: (message: string) => void;
  rewrite?: (style: Partial<StyleValues>) => Partial<StyleValues>;
}

const DEBOUNCE_MS = 250;

function failureText(err: unknown): string {
  if (err instanceof ApiError && err.status === 409) return 'Agent is running. Wait or cancel.';
  return errorText(err);
}

export function useDirectEdits(o: Options): DirectEdit & { blocked: string | null } {
  const opts = useRef(o);
  opts.current = o;
  const bases = useMemo(() => o.selections.map((s) => valuesFromStyles(s.styles)), [o.selections]);
  const basesRef = useRef(bases);
  basesRef.current = bases;
  const merged = useMemo(() => mergeValues(bases), [bases]);
  const mergedRef = useRef(merged);
  mergedRef.current = merged;
  const blocked = useMemo(() => multiBlockReason(o.selections), [o.selections]);
  const [draft, setDraftState] = useState<Partial<StyleValues>>({});
  const draftRef = useRef(draft);
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' });
  const timer = useRef<number | null>(null);
  const inflight = useRef<Promise<void> | null>(null);
  const again = useRef(false);
  const committed = useRef<Partial<StyleValues>>({});

  const setDraft = useCallback((next: Partial<StyleValues>) => {
    draftRef.current = next;
    setDraftState(next);
  }, []);

  const postAll = useCallback((style: Record<string, string | null>) => {
    const port = opts.current.port.current;
    for (const s of opts.current.selections) port?.post({ type: 'preview-style', selector: s.selector, style });
  }, []);

  const resetPreview = useCallback(() => {
    opts.current.port.current?.post({ type: 'preview-reset' });
    if (Object.keys(committed.current).length > 0) postAll(committed.current);
  }, [postAll]);

  const cancel = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    again.current = false;
    setDraft({});
  }, [setDraft]);

  const fail = useCallback(
    (err: unknown) => {
      if (err instanceof ApiError && err.status === 422 && err.code === 'stale_selection') {
        cancel();
        opts.current.port.current?.post({ type: 'preview-reset' });
        opts.current.onStale(err.message);
        return;
      }
      resetPreview();
      setDraft({});
      setStatus({ kind: 'error', message: failureText(err) });
    },
    [cancel, resetPreview, setDraft],
  );

  const pendingStyle = useCallback(() => {
    const style = changedProps(draftRef.current, mergedRef.current.values);
    const rewrite = opts.current.rewrite;
    if (!rewrite || Object.keys(style).length === 0) return style;
    const next = changedProps(rewrite(style), mergedRef.current.values);
    const moved = changedProps(next, { ...mergedRef.current.values, ...style });
    if (Object.keys(moved).length > 0) {
      setDraft({ ...draftRef.current, ...moved });
      postAll(moved);
    }
    return next;
  }, [postAll, setDraft]);

  const flush = useCallback(async () => {
    timer.current = null;
    if (inflight.current) {
      again.current = true;
      return;
    }
    const cur = opts.current;
    if (blocked || !cur.directionId) return;
    const style = pendingStyle();
    const edits = batchEdits(cur.selections, basesRef.current, style);
    if (edits.length === 0) return;
    setStatus({ kind: 'saving' });
    const request = api
      .directEditBatch(cur.projectId, cur.directionId, { edits })
      .then(() => {
        committed.current = { ...committed.current, ...style };
        for (const edit of edits) cur.onCommitted({ selector: edit.selector, style });
        setStatus({ kind: 'saved', at: Date.now() });
      })
      .catch(fail);
    inflight.current = request;
    await request;
    inflight.current = null;
    if (again.current) {
      again.current = false;
      void flush();
    }
  }, [blocked, fail, pendingStyle]);

  const commitSoon = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), DEBOUNCE_MS);
  }, [flush]);

  const commit = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    void flush();
  }, [flush]);

  const preview = useCallback(
    (patch: Partial<StyleValues>) => {
      if (blocked) return;
      setDraft({ ...draftRef.current, ...patch });
      postAll(patch);
      setStatus((s) => (s.kind === 'error' ? { kind: 'idle' } : s));
    },
    [blocked, postAll, setDraft],
  );

  const revert = useCallback(
    (props: DirectStyleProperty[]) => {
      const next = { ...draftRef.current };
      for (const prop of props) delete next[prop];
      setDraft(next);
      const port = opts.current.port.current;
      opts.current.selections.forEach((s, i) => {
        const own = basesRef.current[i];
        const style = Object.fromEntries(props.map((prop) => [prop, own?.[prop] ? own[prop] : null]));
        port?.post({ type: 'preview-style', selector: s.selector, style });
      });
    },
    [setDraft],
  );

  const reset = useCallback(() => {
    cancel();
    resetPreview();
    setStatus({ kind: 'idle' });
  }, [cancel, resetPreview]);

  const settle = useCallback(async () => {
    cancel();
    while (inflight.current) await inflight.current;
  }, [cancel]);

  const drain = useCallback(async () => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current);
      await flush();
    }
    while (inflight.current) await inflight.current;
  }, [flush]);

  const absorb = useCallback(
    (style: Partial<StyleValues>) => {
      committed.current = { ...committed.current, ...style };
      const next = { ...draftRef.current };
      for (const prop of Object.keys(style) as DirectStyleProperty[]) delete next[prop];
      setDraft(next);
      setStatus({ kind: 'saved', at: Date.now() });
    },
    [setDraft],
  );

  const commitText = useCallback(() => false, []);
  const noop = useCallback(() => undefined, []);

  useEffect(() => {
    o.control.current = { cancel, settle, commitText };
    return () => {
      if (o.control.current?.cancel === cancel) o.control.current = null;
      if (timer.current !== null) {
        window.clearTimeout(timer.current);
        void flush();
      }
    };
  }, [cancel, settle, commitText, flush, o.control]);

  const values = useMemo(() => ({ ...merged.values, ...draft }), [merged, draft]);
  const mixed = useMemo(() => {
    const set = new Set(merged.mixed);
    for (const prop of Object.keys(draft) as DirectStyleProperty[]) set.delete(prop);
    return set as ReadonlySet<DirectStyleProperty>;
  }, [merged, draft]);
  const dirty = useMemo(() => Object.keys(draft) as DirectStyleProperty[], [draft]);
  return { values, mixed, text: '', status, preview, revert, commit, commitSoon, previewText: noop, revertText: noop, reset, drain, absorb, dirty, blocked };
}
