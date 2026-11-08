import type {
  EditSessionEnd,
  EditSessionState,
  Version,
} from "@design-studio/contracts";
import {
  startTransition,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  Dispatch,
  MutableRefObject,
  RefObject,
  SetStateAction,
} from "react";

import { api, errorText } from "../../api.js";
import type { PreviewPort } from "../../platform/bridge.js";
import { useProjectEvents } from "../../platform/events.js";
import { stopTimer } from "./timer-model.js";
import type { TimerRef } from "./timer-model.js";
import type { DirectEditControl } from "./use-direct-edit.js";
import { useLatestRef } from "./use-latest-ref.js";

type SessionAction = "save" | "discard";

interface EditSessionHandle {
  readonly isDirty: boolean;
  readonly count: number;
  readonly net: number;
  readonly requestExit: () => Promise<boolean>;
  readonly save: () => Promise<boolean>;
  readonly discard: () => Promise<boolean>;
}

interface Options {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly control: MutableRefObject<DirectEditControl | null>;
  readonly port: MutableRefObject<PreviewPort | null>;
  readonly onEnded?: (action: SessionAction, result: EditSessionEnd) => void;
}

interface SessionView {
  readonly base: string | null;
  readonly count: number;
  readonly net: number;
  readonly isDirty: boolean;
  readonly blocked: string | null;
}

const EMPTY: SessionView = {
  base: null,
  blocked: null,
  count: 0,
  isDirty: false,
  net: 0,
};

const UNDO_PROMPT = 'Undo of "';
const REFRESH_MS = 120;
const VERSION_CREATED = "version.created";

type ProjectEvent = Parameters<Parameters<typeof useProjectEvents>[1]>[0];

type EndChoice = SessionAction | "cancel";

const toUnsavedLabel = (count: number): string => {
  if (count === 0) {
    return "No unsaved edits";
  }

  if (count === 1) {
    return "1 unsaved edit";
  }

  return `${count} unsaved edits`;
};

const toVersionStep = (version: Version): number => {
  if (version.meta.kind !== "manual" || version.meta.origin) {
    return 0;
  }

  if (version.meta.prompt?.startsWith(UNDO_PROMPT)) {
    return -1;
  }

  return 1;
};

const toParentVersion = (
  byId: Map<string, Version>,
  version: Version
): Version | null => {
  if (!version.parentId) {
    return null;
  }

  return byId.get(version.parentId) ?? null;
};

const toNetSteps = (
  versions: Version[],
  base: string,
  fallback: number
): number => {
  const byId = new Map(versions.map((version) => [version.id, version]));
  let net = 0;
  let at = versions[0] ?? null;

  while (at && at.id !== base) {
    net += toVersionStep(at);
    at = toParentVersion(byId, at);
  }

  if (at) {
    return net;
  }

  return fallback;
};

const listVersionsSafe = async (
  projectId: string,
  directionId: string
): Promise<Version[] | null> => {
  try {
    return await api.listVersions(projectId, directionId);
  } catch {
    return null;
  }
};

const toNetCount = (
  versions: Version[] | null,
  base: string,
  count: number
): number => {
  if (versions) {
    return toNetSteps(versions, base, count);
  }

  return count;
};

const getSession = async (
  projectId: string,
  directionId: string,
  base: string
): Promise<SessionView> => {
  const state: EditSessionState = await api.editSession(
    projectId,
    directionId,
    base
  );

  const view = {
    base,
    blocked: state.blocked,
    count: state.count,
    isDirty: state.dirty,
    net: 0,
  };

  if (!state.dirty || state.count === 0) {
    return view;
  }

  const versions = await listVersionsSafe(projectId, directionId);

  return { ...view, net: toNetCount(versions, base, state.count) };
};

const getSessionSafe = async (
  projectId: string,
  directionId: string,
  base: string
): Promise<SessionView | null> => {
  try {
    return await getSession(projectId, directionId, base);
  } catch {
    return null;
  }
};

const toFresh = (base: string | null): SessionView => ({ ...EMPTY, base });

interface UseEditSessionResult {
  readonly answer: (choice: EndChoice) => Promise<void>;
  readonly isAsking: boolean;
  readonly busy: SessionAction | null;
  readonly clearError: () => void;
  readonly discard: () => Promise<boolean>;
  readonly error: string | null;
  readonly requestExit: () => Promise<boolean>;
  readonly save: () => Promise<boolean>;
  readonly base: string | null;
  readonly count: number;
  readonly net: number;
  readonly isDirty: boolean;
  readonly blocked: string | null;
}

interface SessionContext {
  readonly latest: RefObject<Options>;
  readonly viewRef: RefObject<SessionView>;
  readonly setView: Dispatch<SetStateAction<SessionView>>;
  readonly setError: Dispatch<SetStateAction<string | null>>;
}

const runSessionBegin = async (
  ctx: SessionContext,
  projectId: string,
  directionId: string | null
): Promise<void> => {
  if (!directionId) {
    ctx.setView(EMPTY);

    return;
  }

  try {
    const state = await api.editSession(projectId, directionId);

    if (ctx.latest.current.directionId === directionId) {
      ctx.setView(toFresh(state.baseVersionId || null));
    }
  } catch (error) {
    ctx.setError(errorText(error));
  }
};

const isOutsideVersion = (event: ProjectEvent): boolean =>
  event.type === VERSION_CREATED &&
  (event.version.meta.kind !== "manual" || event.version.meta.origin === "mcp");

const useSessionRefresh = (
  ctx: SessionContext,
  directionId: string | null
): void => {
  const { projectId } = ctx.latest.current;
  const { setView, viewRef } = ctx;
  const timer: TimerRef = useRef(null);

  const refresh = useCallback(() => {
    const { base } = viewRef.current;

    if (!directionId || !base) {
      return;
    }

    stopTimer(timer);
    timer.current = globalThis.setTimeout(() => {
      startTransition(async () => {
        const next = await getSessionSafe(projectId, directionId, base);

        if (next !== null && viewRef.current.base === base) {
          setView(next);
        }
      });
    }, REFRESH_MS);
  }, [projectId, directionId, setView, viewRef]);

  useEffect(
    () => (): void => {
      stopTimer(timer);
    },
    []
  );

  useProjectEvents(projectId, (event) => {
    if ((event.directionId ?? directionId) !== directionId) {
      return;
    }

    if (isOutsideVersion(event) && viewRef.current.count === 0) {
      if (event.type === VERSION_CREATED) {
        setView(toFresh(event.version.id));
      }

      return;
    }

    if (
      event.type === "edit-history.changed" ||
      event.type === VERSION_CREATED
    ) {
      refresh();
    }
  });
};

interface EndTarget {
  readonly action: SessionAction;
  readonly base: string;
  readonly directionId: string;
}

const isSessionEnded = async (
  ctx: SessionContext,
  cur: Options,
  target: EndTarget
): Promise<boolean> => {
  const { action, base, directionId } = target;

  try {
    await cur.control.current?.settle();

    if (action === "discard") {
      cur.port.current?.post({ type: "preview-reset" });
      cur.port.current?.post({ type: "optimistic-drop" });
    }

    const result = await api.endEditSession(
      cur.projectId,
      directionId,
      action,
      base
    );

    ctx.setView(toFresh(result.headVersionId));
    cur.onEnded?.(action, result);

    return true;
  } catch (error) {
    ctx.setError(errorText(error));

    return false;
  }
};

const useSessionEnd = (
  ctx: SessionContext
): readonly [
  SessionAction | null,
  (action: SessionAction) => Promise<boolean>,
] => {
  const [busy, setBusy] = useState<SessionAction | null>(null);

  const end = useCallback(
    async (action: SessionAction): Promise<boolean> => {
      const cur = ctx.latest.current;
      const { base } = ctx.viewRef.current;

      if (!cur.directionId || !base) {
        return true;
      }

      setBusy(action);
      ctx.setError(null);

      const isEnded = await isSessionEnded(ctx, cur, {
        action,
        base,
        directionId: cur.directionId,
      });

      setBusy(null);

      return isEnded;
    },
    [ctx]
  );

  return [busy, end];
};

interface ExitPrompt {
  readonly answer: (choice: EndChoice) => Promise<void>;
  readonly isAsking: boolean;
  readonly requestExit: () => Promise<boolean>;
}

const useExitPrompt = (
  viewRef: RefObject<SessionView>,
  end: (action: SessionAction) => Promise<boolean>
): ExitPrompt => {
  const [isAsking, setIsAsking] = useState(false);
  const exitResolve = useRef<((leave: boolean) => void) | null>(null);

  const close = useCallback((leave: boolean) => {
    setIsAsking(false);
    exitResolve.current?.(leave);
    exitResolve.current = null;
  }, []);

  const requestExit = useCallback((): Promise<boolean> => {
    if (viewRef.current.count === 0) {
      return Promise.resolve(true);
    }

    if (!viewRef.current.isDirty || viewRef.current.net <= 0) {
      return end("save");
    }

    exitResolve.current?.(false);
    setIsAsking(true);

    const { promise, resolve } = Promise.withResolvers<boolean>();
    exitResolve.current = resolve;

    return promise;
  }, [end, viewRef]);

  const answer = useCallback(
    async (choice: EndChoice) => {
      if (choice === "cancel") {
        close(false);

        return;
      }

      const isEnded = await end(choice);

      if (isEnded) {
        close(true);
      }
    },
    [end, close]
  );

  return { answer, isAsking, requestExit };
};

const useEditSession = (options: Options): UseEditSessionResult => {
  const { directionId } = options;
  const [view, setView] = useState<SessionView>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const viewRef = useLatestRef(view);
  const latest = useLatestRef(options);

  const ctx = useMemo(
    () => ({ latest, setError, setView, viewRef }),
    [latest, viewRef]
  );

  useEffect(() => {
    startTransition(async () => {
      await runSessionBegin(ctx, options.projectId, directionId);
    });
  }, [ctx, directionId, options.projectId]);

  useSessionRefresh(ctx, directionId);

  const [busy, end] = useSessionEnd(ctx);
  const { answer, isAsking, requestExit } = useExitPrompt(viewRef, end);
  const save = useCallback(() => end("save"), [end]);
  const discard = useCallback(() => end("discard"), [end]);
  const clearError = useCallback(() => setError(null), []);

  return {
    ...view,
    answer,
    busy,
    clearError,
    discard,
    error,
    isAsking,
    requestExit,
    save,
  };
};

type EditSession = ReturnType<typeof useEditSession>;

export { toUnsavedLabel, useEditSession };

export type { SessionAction, EditSessionHandle, EditSession };
