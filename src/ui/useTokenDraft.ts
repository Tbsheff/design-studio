import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CompiledTokenEntry, TokenChange, Version } from '../shared/contracts';
import { ApiError, api, errorText } from './api';
import { broadcastTheme, broadcastTokenCss, holdTokenCssUntilReload, type ThemeChoice } from './tokenFrames';
import { errorPaths, overlayTokens, rawToken, setPending, toChanges, withField, type PendingMap, type PendingToken, type TokenField } from './tokenDraft';
import type { DesignTokens } from './useDesignSystemState';

const PREVIEW_THROTTLE_MS = 60;
const MAX_PREVIEW_TRIES = 4;
export const AGENT_BUSY_MESSAGE = 'Agent is running. Wait or cancel.';

interface Step {
  path: string;
  field: TokenField;
  before: PendingToken | undefined;
}

interface Options {
  projectId: string;
  directionId: string | null;
  tokens: DesignTokens | null;
  onCommitted: (version: Version) => void;
}

type PreviewOutcome = { css: string | null; errors: Record<string, string> };

function substitute(changes: TokenChange[], bad: Record<string, string>, good: PendingMap): TokenChange[] {
  return changes.flatMap((change) => {
    if (bad[change.path] === undefined) return [change];
    const last = good[change.path];
    const same = last && last.value === change.value && last.darkValue === change.darkValue;
    return last && !same ? [{ path: change.path, ...last }] : [];
  });
}

async function previewWithFallback(pid: string, did: string, changes: TokenChange[], good: PendingMap): Promise<PreviewOutcome> {
  const errors: Record<string, string> = {};
  let rest = changes;
  for (let i = 0; i < MAX_PREVIEW_TRIES && rest.length > 0; i += 1) {
    let messages: string[];
    try {
      const result = await api.previewTokens(pid, did, rest);
      if (result.errors.length === 0) {
        for (const change of rest) good[change.path] = { value: change.value, darkValue: change.darkValue };
        return { css: result.css, errors };
      }
      messages = result.errors;
    } catch (err) {
      messages = [errorText(err)];
    }
    const bad = errorPaths(messages, rest);
    if (Object.keys(bad).length === 0) return { css: null, errors: { ...errors, '': messages.join('; ') } };
    Object.assign(errors, bad);
    rest = substitute(rest, bad, good);
  }
  return { css: rest.length === 0 ? '' : null, errors };
}

function commitMessage(err: unknown): string {
  return err instanceof ApiError && err.status === 409 ? AGENT_BUSY_MESSAGE : errorText(err);
}

export function useTokenDraft(o: Options) {
  const [pending, setPendingMap] = useState<PendingMap>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [theme, setThemeState] = useState<ThemeChoice>(null);
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const history = useRef<Step[]>([]);
  const good = useRef<PendingMap>({});
  const seq = useRef(0);
  const timer = useRef<number | null>(null);
  const lastSent = useRef(0);
  const opts = useRef(o);
  opts.current = o;
  const pendingRef = useRef(pending);
  pendingRef.current = pending;

  const stopPreview = useCallback(() => {
    seq.current += 1;
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  }, []);

  const runPreview = useCallback(async () => {
    timer.current = null;
    lastSent.current = Date.now();
    const my = ++seq.current;
    const { projectId, directionId } = opts.current;
    const changes = toChanges(pendingRef.current);
    if (changes.length === 0 || !directionId) {
      setErrors({});
      broadcastTokenCss('');
      return;
    }
    const outcome = await previewWithFallback(projectId, directionId, changes, good.current);
    if (my !== seq.current) return;
    setErrors(outcome.errors);
    if (outcome.css !== null) broadcastTokenCss(outcome.css);
  }, []);

  const schedule = useCallback(() => {
    if (timer.current !== null) return;
    const wait = Math.max(0, PREVIEW_THROTTLE_MS - (Date.now() - lastSent.current));
    timer.current = window.setTimeout(() => void runPreview(), wait);
  }, [runPreview]);

  const clearDraft = useCallback(() => {
    stopPreview();
    history.current = [];
    good.current = {};
    pendingRef.current = {};
    setPendingMap({});
    setErrors({});
    setCommitError(null);
  }, [stopPreview]);

  const reset = useCallback(() => {
    clearDraft();
    broadcastTokenCss('');
  }, [clearDraft]);

  const scope = `${o.projectId}:${o.directionId}`;
  useEffect(() => reset, [scope, reset]);

  const apply = useCallback(
    (next: PendingMap) => {
      pendingRef.current = next;
      setPendingMap(next);
      setCommitError(null);
      schedule();
    },
    [schedule],
  );

  const edit = useCallback(
    (entry: CompiledTokenEntry, field: TokenField, value: string | null) => {
      const map = pendingRef.current;
      const last = history.current[history.current.length - 1];
      if (!last || last.path !== entry.path || last.field !== field) history.current.push({ path: entry.path, field, before: map[entry.path] });
      const base = rawToken(opts.current.tokens?.file ?? null, entry);
      apply(setPending(map, entry.path, withField(map[entry.path], field, value, base)));
    },
    [apply],
  );

  const revert = useCallback(
    (path: string) => {
      history.current = history.current.filter((step) => step.path !== path);
      apply(setPending(pendingRef.current, path, undefined));
    },
    [apply],
  );

  const undoLast = useCallback(() => {
    const step = history.current.pop();
    if (step) apply(setPending(pendingRef.current, step.path, step.before));
  }, [apply]);

  const setTheme = useCallback((next: ThemeChoice) => {
    setThemeState(next);
    broadcastTheme(next);
  }, []);

  const commit = useCallback(async () => {
    const { projectId, directionId, tokens } = opts.current;
    const changes = toChanges(pendingRef.current);
    if (!directionId || changes.length === 0) return;
    stopPreview();
    setCommitting(true);
    setCommitError(null);
    try {
      const result = await api.updateTokens(projectId, directionId, changes);
      tokens?.replace(result.state);
      clearDraft();
      holdTokenCssUntilReload();
      opts.current.onCommitted(result.version);
    } catch (err) {
      setCommitError(commitMessage(err));
      setErrors((prev) => ({ ...prev, ...errorPaths([errorText(err)], changes) }));
    } finally {
      setCommitting(false);
    }
  }, [clearDraft, stopPreview]);

  const confirmLeave = useCallback(() => {
    const count = Object.keys(pendingRef.current).length;
    if (count === 0) return true;
    const ok = window.confirm(`Discard ${count} token ${count === 1 ? 'change' : 'changes'}?`);
    if (ok) reset();
    return ok;
  }, [reset]);

  const count = Object.keys(pending).length;
  const effective = useMemo(() => overlayTokens(o.tokens, pending), [o.tokens, pending]);

  return { pending, errors, count, theme, committing, commitError, effective, edit, revert, undoLast, setTheme, commit, discard: reset, confirmLeave };
}

export type TokenDraft = ReturnType<typeof useTokenDraft>;
