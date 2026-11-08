import type { Project, RunRequest, Version } from "@design-studio/contracts";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { tweaksPreviewCss } from "../../../shared/tweaks.js";
import type {
  TweakControl,
  TweaksState,
  TweakValue,
} from "../../../shared/tweaks.js";
import { api, errorText } from "../../api.js";
import {
  broadcastTweakCss,
  holdTweakCssUntilReload,
} from "../design-system/token-frames.js";
import type { FilesChange } from "../home/use-studio-data.js";
import { AGENT_BUSY_MESSAGE } from "../versions-layers-tokens/use-token-draft.js";
import { isApiConflict } from "./api-error.js";

type TweakMap = Record<string, TweakValue>;

const TWEAKS_REQUEST: RunRequest = {
  mode: "edit",
  prompt:
    "Suggest tweaks for this design: add 3 to 8 live controls (spacing, accent color, radius, density, font size, a layout toggle) bound to CSS variables. Keep the look the same at the default values.",
  task: "tweaks",
};

interface Step {
  readonly id: string;
  readonly before: TweakValue | undefined;
}

interface Options {
  readonly projectId: string;
  readonly project: Project | null;
  readonly directionId: string | null;
  readonly lastChange: FilesChange | null;
  readonly onCommitted: (version: Version) => void;
}

const toChangeStamp = (
  change: FilesChange | null,
  directionId: string | null
): number =>
  change && change.directionId === directionId ? change.receivedAt : 0;

const toBaseValue = (
  state: TweaksState | null,
  control: TweakControl
): TweakValue => state?.current[control.id] ?? control.default;

const useTweaksState = (
  options: Options
): {
  readonly loadError: string | null;
  readonly replace: (state: TweaksState) => void;
  readonly state: TweaksState | null;
} => {
  const [loaded, setLoaded] = useState<{
    readonly key: string;
    readonly state: TweaksState;
  } | null>(null);

  const [loadError, setLoadError] = useState<string | null>(null);

  const headVersionId =
    options.project?.directions.find(
      (direction) => direction.id === options.directionId
    )?.headVersionId ?? null;

  const stamp = toChangeStamp(options.lastChange, options.directionId);
  const key = `${options.projectId}:${options.directionId}`;
  const live = useRef(key);
  live.current = key;

  useEffect(() => {
    const { directionId } = options;

    if (!directionId) {
      return;
    }

    const want = `${options.projectId}:${directionId}`;
    startTransition(async () => {
      try {
        const state = await api.getTweaks(options.projectId, directionId);

        if (live.current !== want) {
          return;
        }

        setLoaded({ key: want, state });
        setLoadError(null);
      } catch (error: unknown) {
        if (live.current === want) {
          setLoadError(errorText(error));
        }
      }
    });
  }, [options.projectId, options.directionId, headVersionId, stamp]);

  const replace = useCallback(
    (state: TweaksState) => setLoaded({ key: live.current, state }),
    []
  );

  const state = loaded?.key === key ? loaded.state : null;

  return { loadError, replace, state };
};

interface UseTweaksResult {
  readonly commit: () => Promise<void>;
  readonly commitError: string | null;
  readonly isCommitting: boolean;
  readonly confirmLeave: () => boolean;
  readonly count: number;
  readonly discard: () => void;
  readonly edit: (control: TweakControl, value: TweakValue) => void;
  readonly loadError: string | null;
  readonly pending: TweakMap;
  readonly revert: (id: string) => void;
  readonly state: TweaksState | null;
  readonly undoChain: (
    canUndo: boolean,
    fallback: () => void
  ) => { readonly canUndo: boolean; readonly onUndo: () => void };
  readonly undoLast: () => void;
  readonly values: TweakMap;
}

const useTweaks = (options: Options): UseTweaksResult => {
  const { state, loadError, replace } = useTweaksState(options);
  const [pending, setPendingMap] = useState<TweakMap>({});
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const history = useRef<Step[]>([]);
  const frame = useRef<number | null>(null);
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const stateRef = useRef(state);
  stateRef.current = state;
  const opts = useRef(options);
  opts.current = options;

  const stopPreview = useCallback(() => {
    if (frame.current !== null) {
      globalThis.cancelAnimationFrame(frame.current);
    }

    frame.current = null;
  }, []);

  const schedulePreview = useCallback(() => {
    if (frame.current !== null) {
      return;
    }

    frame.current = globalThis.requestAnimationFrame(() => {
      frame.current = null;
      broadcastTweakCss(
        tweaksPreviewCss(stateRef.current?.controls ?? [], pendingRef.current)
      );
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
    broadcastTweakCss("");
  }, [clearDraft]);

  const scope = `${options.projectId}:${options.directionId}`;
  useEffect(() => discard, [scope, discard]);

  const apply = useCallback(
    (next: TweakMap) => {
      pendingRef.current = next;
      setPendingMap(next);
      setCommitError(null);
      schedulePreview();
    },
    [schedulePreview]
  );

  const edit = useCallback(
    (control: TweakControl, value: TweakValue) => {
      const map = pendingRef.current;
      const last = history.current.at(-1);

      if (!last || last.id !== control.id) {
        history.current.push({ before: map[control.id], id: control.id });
      }

      const next = { ...map };

      if (value === toBaseValue(stateRef.current, control)) {
        delete next[control.id];
      } else {
        next[control.id] = value;
      }

      apply(next);
    },
    [apply]
  );

  const revert = useCallback(
    (id: string) => {
      history.current = history.current.filter((step) => step.id !== id);
      const next = { ...pendingRef.current };
      delete next[id];
      apply(next);
    },
    [apply]
  );

  const undoLast = useCallback(() => {
    const step = history.current.pop();

    if (!step) {
      return;
    }

    const next = { ...pendingRef.current };

    if (step.before === undefined) {
      delete next[step.id];
    } else {
      next[step.id] = step.before;
    }

    apply(next);
  }, [apply]);

  const commit = useCallback(async () => {
    const { projectId, directionId } = opts.current;
    const values = pendingRef.current;

    if (!directionId || Object.keys(values).length === 0) {
      return;
    }

    stopPreview();
    broadcastTweakCss(
      tweaksPreviewCss(stateRef.current?.controls ?? [], values)
    );
    setCommitting(true);
    setCommitError(null);

    try {
      const result = await api.commitTweaks(projectId, directionId, values);
      replace(result.state);
      clearDraft();
      holdTweakCssUntilReload();
      opts.current.onCommitted(result.version);
    } catch (error) {
      setCommitError(
        isApiConflict(error) ? AGENT_BUSY_MESSAGE : errorText(error)
      );
    } finally {
      setCommitting(false);
    }
  }, [clearDraft, replace, stopPreview]);

  const confirmLeave = useCallback(() => {
    const count = Object.keys(pendingRef.current).length;

    if (count === 0) {
      return true;
    }

    const ok = globalThis.confirm(
      `Discard ${count} tweak ${count === 1 ? "change" : "changes"}?`
    );

    if (ok) {
      discard();
    }

    return ok;
  }, [discard]);

  const count = Object.keys(pending).length;

  const undoChain = (
    canUndo: boolean,
    fallback: () => void
  ): { readonly canUndo: boolean; readonly onUndo: () => void } => ({
    canUndo: canUndo || count > 0,
    onUndo: () =>
      Object.keys(pendingRef.current).length > 0 ? undoLast() : fallback(),
  });

  const values = useMemo(() => {
    const out: TweakMap = {};

    for (const control of state?.controls ?? []) {
      out[control.id] = pending[control.id] ?? toBaseValue(state, control);
    }

    return out;
  }, [state, pending]);

  return {
    commit,
    commitError,
    confirmLeave,
    count,
    discard,
    edit,
    isCommitting: committing,
    loadError,
    pending,
    revert,
    state,
    undoChain,
    undoLast,
    values,
  };
};

type TweaksDraft = ReturnType<typeof useTweaks>;

export { TWEAKS_REQUEST, useTweaks };

export type { TweaksDraft };
