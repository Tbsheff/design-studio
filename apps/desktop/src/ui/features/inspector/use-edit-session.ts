import type {
  EditSessionEnd,
  EditSessionState,
  Version,
} from "@design-studio/contracts";
import { useCallback, useEffect, useRef, useState } from "react";
import type { MutableRefObject } from "react";

import { api, errorText } from "../../api.js";
import type { PreviewPort } from "../../platform/bridge.js";
import { useProjectEvents } from "../../platform/events.js";
import type { DirectEditControl } from "./use-direct-edit.js";

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

const unsavedLabel = (count: number): string => {
  if (count === 0) {
    return "No unsaved edits";
  }

  return count === 1 ? "1 unsaved edit" : `${count} unsaved edits`;
};

const netSteps = (
  versions: Version[],
  base: string,
  fallback: number
): number => {
  const byId = new Map(versions.map((version) => [version.id, version]));
  let net = 0;
  let at = versions[0];

  while (at && at.id !== base) {
    if (at.meta.kind === "manual" && at.meta.origin === undefined) {
      net += at.meta.prompt?.startsWith(UNDO_PROMPT) ? -1 : 1;
    }

    at = at.parentId ? byId.get(at.parentId) : undefined;
  }

  return at ? net : fallback;
};

const readSession = async (
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

  const versions = await api
    .listVersions(projectId, directionId)
    .catch(() => null);

  return {
    ...view,
    net: versions ? netSteps(versions, base, state.count) : state.count,
  };
};

const fresh = (base: string | null): SessionView => ({ ...EMPTY, base });

const useEditSession = (o: Options) => {
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
    if (!directionId) {
      return setView(EMPTY);
    }

    api
      .editSession(projectId, directionId)
      .then(
        (state) =>
          opts.current.directionId === directionId &&
          setView(fresh(state.baseVersionId || null))
      )
      .catch((err: unknown) => setError(errorText(err)));
  }, [projectId, directionId]);

  useEffect(begin, [begin]);

  const refresh = useCallback(() => {
    const { base } = viewRef.current;

    if (!directionId || !base) {
      return;
    }

    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      readSession(projectId, directionId, base)
        .then((next) => {
          if (viewRef.current.base === base) {
            setView(next);
          }
        })
        .catch(() => undefined);
    }, REFRESH_MS);
  }, [projectId, directionId]);

  useEffect(() => (): void => window.clearTimeout(timer.current), []);
  useProjectEvents(projectId, (event) => {
    if (event.directionId !== undefined && event.directionId !== directionId) {
      return;
    }

    const outside =
      event.type === "version.created" &&
      (event.version.meta.kind !== "manual" ||
        event.version.meta.origin === "mcp");

    if (
      event.type === "version.created" &&
      outside &&
      viewRef.current.count === 0
    ) {
      setView(fresh(event.version.id));

      return;
    }

    if (
      event.type === "edit-history.changed" ||
      event.type === "version.created"
    ) {
      refresh();
    }
  });

  const end = useCallback(async (action: SessionAction): Promise<boolean> => {
    const cur = opts.current;
    const { base } = viewRef.current;

    if (!cur.directionId || !base) {
      return true;
    }

    setBusy(action);
    setError(null);

    try {
      await cur.control.current?.settle();

      if (action === "discard") {
        cur.port.current?.post({ type: "preview-reset" });
        cur.port.current?.post({ type: "optimistic-drop" });
      }

      const result = await api.endEditSession(
        cur.projectId,
        cur.directionId,
        action,
        base
      );

      setView(fresh(result.headVersionId));
      cur.onEnded?.(action, result);

      return true;
    } catch (err) {
      setError(errorText(err));

      return false;
    } finally {
      setBusy(null);
    }
  }, []);

  const close = useCallback((leave: boolean) => {
    setAsking(false);
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
    setAsking(true);

    return new Promise<boolean>((resolve) => {
      exitResolve.current = resolve;
    });
  }, [end]);

  const answer = useCallback(
    async (choice: SessionAction | "cancel") => {
      if (choice === "cancel") {
        return close(false);
      }

      const ok = await end(choice);

      if (ok) {
        close(true);
      }
    },
    [end, close]
  );

  const save = useCallback(() => end("save"), [end]);
  const discard = useCallback(() => end("discard"), [end]);

  return {
    ...view,
    answer,
    asking,
    busy,
    clearError: () => setError(null),
    discard,
    error,
    requestExit,
    save,
  };
};

type EditSession = ReturnType<typeof useEditSession>;

export { unsavedLabel, useEditSession };

export type { SessionAction, EditSessionHandle, EditSession };
