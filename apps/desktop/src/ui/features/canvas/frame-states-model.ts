import { routes } from "@design-studio/actions/canvas/routes";
import type { StudioEvent } from "@design-studio/contracts";
import {
  DEFAULT_FRAME_STATE,
  DEFAULT_MOCK_USER,
  withFrameStateHost,
} from "@design-studio/contracts/frame-state";
import type {
  FrameStateDef,
  FrameStatesView,
  MockUser,
} from "@design-studio/contracts/frame-state";
import { useCallback, useEffect, useSyncExternalStore } from "react";

import { useProjectEvents } from "../../platform/events.js";
import { call } from "../../platform/http.js";
import type { RouteInput } from "../../platform/http.js";

type FrameStateMock = NonNullable<
  RouteInput<typeof routes.setFrameStateCanvas>["mock"]
>;

const views = new Map<string, FrameStatesView>();
const loading = new Set<string>();
const listeners = new Set<() => void>();
let current: string | null = null;

const notify = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);

  return () => listeners.delete(listener);
};

const store = (projectId: string, view: FrameStatesView): void => {
  views.set(projectId, view);
  notify();
};

const emptyView = (): FrameStatesView => ({
  frames: {},
  session: {
    captured: [],
    capturedAt: null,
    user: { ...DEFAULT_MOCK_USER },
    usesMockUser: true,
  },
  states: [],
});

const fetchView = async (projectId: string): Promise<void> => {
  try {
    store(projectId, await call(routes.listFrameStatesCanvas, { projectId }));
  } catch {
    if (!views.has(projectId)) {
      store(projectId, emptyView());
    }
  } finally {
    loading.delete(projectId);
  }
};

const load = (projectId: string): void => {
  if (loading.has(projectId)) {
    return;
  }

  loading.add(projectId);
  void fetchView(projectId);
};

type FrameStatesRead = FrameStatesView | null | undefined;

const useFrameStates = (projectId: string, isApp: boolean): FrameStatesRead => {
  useEffect(() => {
    if (!isApp) {
      return;
    }

    current = projectId;
    notify();
    load(projectId);

    return (): void => {
      if (current === projectId) {
        current = null;
      }

      notify();
    };
  }, [projectId, isApp]);

  let argument: string | null = null;

  if (isApp) {
    argument = projectId;
  }

  useProjectEvents(argument, (event: StudioEvent) => {
    if (event.type === "frame-states.changed") {
      store(projectId, event.states);
    }
  });

  const read = useCallback(() => {
    if (isApp) {
      return views.get(projectId);
    }

    return null;
  }, [projectId, isApp]);

  return useSyncExternalStore(subscribe, read, read);
};

const useCurrentFrameStates = (): {
  projectId: string;
  view: FrameStatesView;
} | null => {
  const read = useCallback(() => {
    if (current) {
      return views.get(current) ?? null;
    }

    return null;
  }, []);

  const view = useSyncExternalStore(subscribe, read, read);

  if (current && view) {
    return { projectId: current, view };
  }

  return null;
};

const frameStateOf = (view: FrameStatesView | null, frameId: string): string =>
  view?.frames[frameId] ?? DEFAULT_FRAME_STATE;

const frameStateUrl = (
  url: string | null,
  view: FrameStatesRead,
  frameId: string
): string | null => {
  if (!url || view === undefined) {
    return null;
  }

  if (view) {
    return withFrameStateHost(url, frameStateOf(view, frameId));
  }

  return url;
};

const setFrameState = async (
  projectId: string,
  frameId: string,
  state: string,
  mock?: FrameStateMock
): Promise<FrameStateDef> => {
  const done = await call(routes.setFrameStateCanvas, {
    frame: frameId,
    projectId,
    state,
    ...(mock ? { mock } : {}),
  });

  store(projectId, done.view);

  return done.state;
};

const setFrameSession = async (
  projectId: string,
  change: { user?: MockUser; forget?: boolean }
): Promise<void> => {
  const view = await call(routes.updateFrameSessionCanvas, {
    projectId,
    ...(change.forget === undefined ? {} : { forget: change.forget }),
    ...(change.user ? { user: change.user } : {}),
  });

  store(projectId, view);
};

export {
  frameStateOf,
  frameStateUrl,
  setFrameSession,
  setFrameState,
  useCurrentFrameStates,
  useFrameStates,
};

export type { FrameStatesRead };
