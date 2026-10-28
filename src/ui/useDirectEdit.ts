import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import type { DirectEditRequest, DirectStyleProperty, SelectionContext, TailwindOutcome } from '../shared/contracts';
import { ApiError, api, errorText } from './api';
import type { PreviewPort } from './bridge';
import { changedProps, valuesFromStyles, type StyleValues } from './cssValues';

export type SaveStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: number }
  | { kind: 'error'; message: string; code?: string };

export interface DirectEditControl {
  cancel: () => void;
  settle: () => Promise<void>;
  commitText: (selector: string, text: string) => boolean;
}

export interface DirectEditCommit {
  selector: string;
  style: Partial<StyleValues>;
  text?: string;
}

interface Options {
  projectId: string;
  directionId: string | null;
  selection: SelectionContext;
  port: MutableRefObject<PreviewPort | null>;
  control: MutableRefObject<DirectEditControl | null>;
  onCommitted: (commit: DirectEditCommit) => void;
  onStale: (message: string) => void;
  rewrite?: StyleRewrite;
}

type StyleRewrite = (style: Partial<StyleValues>) => Partial<StyleValues>;

export function mergeCommit(prev: SelectionContext[], commit: DirectEditCommit): SelectionContext[] {
  return prev.map((s) =>
    s.selector === commit.selector
      ? { ...s, styles: { ...s.styles, ...commit.style }, text: commit.text ?? s.text }
      : s,
  );
}

export const NO_MIXED: ReadonlySet<DirectStyleProperty> = new Set();

const DEBOUNCE_MS = 250;
const AGENT_RUNNING_MESSAGE = 'Agent is running. Wait or cancel.';

function isStaleSelection(err: unknown): err is ApiError {
  return err instanceof ApiError && err.status === 422 && err.code === 'stale_selection';
}

function failureText(err: unknown): string {
  if (err instanceof ApiError && err.status === 409) return AGENT_RUNNING_MESSAGE;
  return errorText(err);
}

export function buildEditRequest(selection: SelectionContext, style: Partial<StyleValues>, text?: string): DirectEditRequest | null {
  const source = selection.source;
  if (!source) return null;
  const hasStyle = Object.keys(style).length > 0;
  if (!hasStyle && text === undefined) return null;
  const wire = Object.fromEntries(Object.entries(style).map(([prop, value]) => [prop, value.trim() === '' ? null : value.trim()]));
  const target = selection.component ? { component: selection.component } : { tag: selection.tag.toLowerCase() };
  return { source, selector: selection.selector, ...target, ...(hasStyle ? { style: wire } : {}), ...(text !== undefined ? { text } : {}) };
}

export function useDirectEdit(o: Options) {
  const opts = useRef(o);
  opts.current = o;
  const base = useMemo(() => valuesFromStyles(o.selection.styles), [o.selection.styles]);
  const baseRef = useRef(base);
  baseRef.current = base;
  const [draft, setDraftState] = useState<Partial<StyleValues>>({});
  const draftRef = useRef(draft);
  const [textDraft, setTextDraftState] = useState<string | null>(null);
  const textRef = useRef(textDraft);
  const [status, setStatus] = useState<SaveStatus>({ kind: 'idle' });
  const [tailwind, setTailwind] = useState<TailwindOutcome | null>(null);
  const timer = useRef<number | null>(null);
  const inflight = useRef<Promise<void> | null>(null);
  const again = useRef(false);
  const committed = useRef<{ style: Partial<StyleValues>; text?: string }>({ style: {} });

  const setDraft = useCallback((next: Partial<StyleValues>) => {
    draftRef.current = next;
    setDraftState(next);
  }, []);

  const setTextDraft = useCallback((next: string | null) => {
    textRef.current = next;
    setTextDraftState(next);
  }, []);

  const post = useCallback((body: Parameters<PreviewPort['post']>[0]) => opts.current.port.current?.post(body), []);

  const resetPreview = useCallback(() => {
    post({ type: 'preview-reset' });
    const selector = opts.current.selection.selector;
    const kept = committed.current;
    if (Object.keys(kept.style).length > 0) post({ type: 'preview-style', selector, style: kept.style });
    if (kept.text !== undefined) post({ type: 'preview-text', selector, text: kept.text });
  }, [post]);

  const cancel = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
    again.current = false;
    setDraft({});
    setTextDraft(null);
  }, [setDraft, setTextDraft]);

  const fail = useCallback(
    (err: unknown) => {
      if (isStaleSelection(err)) {
        cancel();
        post({ type: 'preview-reset' });
        opts.current.onStale(err.message);
        return;
      }
      resetPreview();
      setDraft({});
      setTextDraft(null);
      setStatus({ kind: 'error', message: failureText(err), ...(err instanceof ApiError && err.code ? { code: err.code } : {}) });
    },
    [cancel, post, resetPreview, setDraft, setTextDraft],
  );

  const rewriteDraft = useCallback(
    (style: Partial<StyleValues>) => {
      const rewrite = opts.current.rewrite;
      if (!rewrite || Object.keys(style).length === 0) return style;
      const next = changedProps(rewrite(style), baseRef.current);
      const moved = changedProps(next, { ...baseRef.current, ...style });
      if (Object.keys(moved).length === 0) return next;
      setDraft({ ...draftRef.current, ...moved });
      post({ type: 'preview-style', selector: opts.current.selection.selector, style: moved });
      return next;
    },
    [post, setDraft],
  );

  const flush = useCallback(async () => {
    timer.current = null;
    if (inflight.current) {
      again.current = true;
      return;
    }
    const cur = opts.current;
    const style = rewriteDraft(changedProps(draftRef.current, baseRef.current));
    const pendingText = textRef.current;
    const text = pendingText !== null && pendingText !== cur.selection.text ? pendingText : undefined;
    const req = buildEditRequest(cur.selection, style, text);
    if (!req || !cur.directionId) return;
    setStatus({ kind: 'saving' });
    const request = api
      .directEdit(cur.projectId, cur.directionId, req)
      .then((result) => {
        setTailwind(result.tailwind ?? null);
        committed.current = { style: { ...committed.current.style, ...style }, text: text ?? committed.current.text };
        cur.onCommitted({ selector: req.selector, style, text });
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
  }, [fail, rewriteDraft]);

  const commitSoon = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => void flush(), DEBOUNCE_MS);
  }, [flush]);

  const commit = useCallback(() => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    void flush();
  }, [flush]);
  const commitText = useCallback(
    (selector: string, text: string) => {
      const cur = opts.current;
      if (selector !== cur.selection.selector || !cur.selection.source || !cur.directionId) return false;
      if (timer.current !== null) window.clearTimeout(timer.current);
      setTextDraft(text);
      void flush();
      return true;
    },
    [flush, setTextDraft],
  );

  const preview = useCallback(
    (patch: Partial<StyleValues>) => {
      setDraft({ ...draftRef.current, ...patch });
      post({ type: 'preview-style', selector: opts.current.selection.selector, style: patch });
      setStatus((s) => (s.kind === 'error' ? { kind: 'idle' } : s));
    },
    [post, setDraft],
  );

  const revert = useCallback(
    (props: DirectStyleProperty[]) => {
      const next = { ...draftRef.current };
      const style: Record<string, string | null> = {};
      for (const prop of props) {
        delete next[prop];
        style[prop] = baseRef.current[prop] === '' ? null : baseRef.current[prop];
      }
      setDraft(next);
      post({ type: 'preview-style', selector: opts.current.selection.selector, style });
    },
    [post, setDraft],
  );

  const previewText = useCallback(
    (text: string) => {
      setTextDraft(text);
      post({ type: 'preview-text', selector: opts.current.selection.selector, text });
    },
    [post, setTextDraft],
  );

  const revertText = useCallback(() => {
    setTextDraft(null);
    post({ type: 'preview-text', selector: opts.current.selection.selector, text: opts.current.selection.text });
  }, [post, setTextDraft]);

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
      committed.current = { ...committed.current, style: { ...committed.current.style, ...style } };
      const next = { ...draftRef.current };
      for (const prop of Object.keys(style) as DirectStyleProperty[]) delete next[prop];
      setDraft(next);
      setStatus({ kind: 'saved', at: Date.now() });
    },
    [setDraft],
  );

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

  const values = useMemo(() => ({ ...base, ...draft }), [base, draft]);
  const dirty = useMemo(() => Object.keys(draft) as DirectStyleProperty[], [draft]);
  const text = textDraft ?? o.selection.text;
  return { values, mixed: NO_MIXED, text, status, tailwind, preview, revert, commit, commitSoon, previewText, revertText, reset, drain, absorb, dirty };
}

export type DirectEdit = ReturnType<typeof useDirectEdit>;
