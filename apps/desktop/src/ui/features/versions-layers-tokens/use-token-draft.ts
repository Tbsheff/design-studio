import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type {
  CompiledTokenEntry,
  TokenChange,
  Version,
} from "../../../shared/actions/_core/contracts.js";
import { ApiError, api, errorText } from "../../api.js";
import {
  broadcastTheme,
  broadcastTokenCss,
  holdTokenCssUntilReload,
  useCanvasTheme,
} from "../design-system/token-frames.js";
import type { ThemeChoice } from "../design-system/token-frames.js";
import type { DesignTokens } from "../design-system/use-design-system-state.js";
import {
  errorPaths,
  overlayTokens,
  rawToken,
  setPending,
  toChanges,
  withField,
} from "./token-draft.js";
import type { PendingMap, PendingToken, TokenField } from "./token-draft.js";

const PREVIEW_THROTTLE_MS = 60;
const MAX_PREVIEW_TRIES = 4;

const releaseFlag = (set: (value: boolean) => void) => {
  set(false);
};

export const AGENT_BUSY_MESSAGE = "Agent is running. Wait or cancel.";

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

interface PreviewOutcome {
  css: string | null;
  errors: Record<string, string>;
}

function substitute(
  changes: TokenChange[],
  bad: Record<string, string>,
  good: PendingMap
): TokenChange[] {
  return changes.flatMap((change) => {
    if (bad[change.path] === undefined) {
      return [change];
    }

    const last = good[change.path];

    const same =
      last &&
      last.value === change.value &&
      last.darkValue === change.darkValue;

    return last && !same ? [{ path: change.path, ...last }] : [];
  });
}

async function previewWithFallback(
  pid: string,
  did: string,
  changes: TokenChange[],
  good: PendingMap
): Promise<PreviewOutcome> {
  const errors: Record<string, string> = {};
  let rest = changes;

  for (let i = 0; i < MAX_PREVIEW_TRIES && rest.length > 0; i += 1) {
    let messages: string[];

    try {
      const result = await api.previewTokens(pid, did, rest);

      if (result.errors.length === 0) {
        for (const change of rest) {
          good[change.path] = {
            darkValue: change.darkValue,
            value: change.value,
          };
        }

        return { css: result.css, errors };
      }

      messages = result.errors;
    } catch (error) {
      messages = [errorText(error)];
    }

    const bad = errorPaths(messages, rest);

    if (Object.keys(bad).length === 0) {
      return { css: null, errors: { ...errors, "": messages.join("; ") } };
    }

    Object.assign(errors, bad);
    rest = substitute(rest, bad, good);
  }

  return { css: rest.length === 0 ? "" : null, errors };
}

function commitMessage(err: unknown): string {
  return err instanceof ApiError && err.status === 409
    ? AGENT_BUSY_MESSAGE
    : errorText(err);
}

export function useTokenDraft(o: Options) {
  const [pending, setPendingMap] = useState<PendingMap>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const theme = useCanvasTheme();
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

    if (timer.current !== null) {
      window.clearTimeout(timer.current);
    }

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
      broadcastTokenCss("");

      return;
    }

    const outcome = await previewWithFallback(
      projectId,
      directionId,
      changes,
      good.current
    );

    if (my !== seq.current) {
      return;
    }

    setErrors(outcome.errors);

    if (outcome.css !== null) {
      broadcastTokenCss(outcome.css);
    }
  }, []);

  const schedule = useCallback(() => {
    if (timer.current !== null) {
      return;
    }

    const wait = Math.max(
      0,
      PREVIEW_THROTTLE_MS - (Date.now() - lastSent.current)
    );

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
    broadcastTokenCss("");
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
    [schedule]
  );

  const edit = useCallback(
    (entry: CompiledTokenEntry, field: TokenField, value: string | null) => {
      const map = pendingRef.current;
      const last = history.current.at(-1);

      if (!last || last.path !== entry.path || last.field !== field) {
        history.current.push({
          before: map[entry.path],
          field,
          path: entry.path,
        });
      }

      const base = rawToken(opts.current.tokens?.file ?? null, entry);
      apply(
        setPending(
          map,
          entry.path,
          withField(map[entry.path], field, value, base)
        )
      );
    },
    [apply]
  );

  const revert = useCallback(
    (path: string) => {
      history.current = history.current.filter((step) => step.path !== path);
      apply(setPending(pendingRef.current, path, undefined));
    },
    [apply]
  );

  const undoLast = useCallback(() => {
    const step = history.current.pop();

    if (step) {
      apply(setPending(pendingRef.current, step.path, step.before));
    }
  }, [apply]);

  const setTheme = useCallback((next: ThemeChoice) => broadcastTheme(next), []);
  useEffect(() => () => broadcastTheme(null), [scope]);

  const commit = useCallback(async () => {
    const { projectId, directionId, tokens } = opts.current;
    const changes = toChanges(pendingRef.current);

    if (!directionId || changes.length === 0) {
      return;
    }

    stopPreview();
    setCommitting(true);
    setCommitError(null);

    try {
      const result = await api.updateTokens(projectId, directionId, changes);
      tokens?.replace(result.state);
      clearDraft();
      holdTokenCssUntilReload();
      opts.current.onCommitted(result.version);
    } catch (error) {
      setCommitError(commitMessage(error));
      setErrors((prev) => ({
        ...prev,
        ...errorPaths([errorText(error)], changes),
      }));
    } finally {
      releaseFlag(setCommitting);
    }
  }, [clearDraft, stopPreview]);

  const confirmLeave = useCallback(() => {
    const count = Object.keys(pendingRef.current).length;

    if (count === 0) {
      return true;
    }

    const ok = window.confirm(
      `Discard ${count} token ${count === 1 ? "change" : "changes"}?`
    );

    if (ok) {
      reset();
    }

    return ok;
  }, [reset]);

  const count = Object.keys(pending).length;

  const effective = useMemo(
    () => overlayTokens(o.tokens, pending),
    [o.tokens, pending]
  );

  return {
    commit,
    commitError,
    committing,
    confirmLeave,
    count,
    discard: reset,
    edit,
    effective,
    errors,
    pending,
    revert,
    setTheme,
    theme,
    undoLast,
  };
}

export type TokenDraft = ReturnType<typeof useTokenDraft>;
