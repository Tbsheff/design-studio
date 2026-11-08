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

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);

  return () => listeners.delete(listener);
}

function store(projectId: string, view: FrameStatesView): void {
  views.set(projectId, view);
  notify();
}

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

function load(projectId: string): void {
  if (loading.has(projectId)) {
    return;
  }

  loading.add(projectId);
  void fetchView(projectId);
}

type FrameStatesRead = FrameStatesView | null | undefined;

function useFrameStates(projectId: string, isApp: boolean): FrameStatesRead {
  useEffect(() => {
    if (!isApp) {
      return;
    }

    current = projectId;
    notify();
    load(projectId);

    return () => {
      if (current === projectId) {
        current = null;
      }

      notify();
    };
  }, [projectId, isApp]);
  useProjectEvents(isApp ? projectId : null, (event: StudioEvent) => {
    if (event.type === "frame-states.changed") {
      store(projectId, event.states);
    }
  });

  const read = useCallback(
    () => (isApp ? views.get(projectId) : null),
    [projectId, isApp]
  );

  return useSyncExternalStore(subscribe, read, read);
}

function useCurrentFrameStates(): {
  projectId: string;
  view: FrameStatesView;
} | null {
  const read = useCallback(
    () => (current ? (views.get(current) ?? null) : null),
    []
  );

  const view = useSyncExternalStore(subscribe, read, read);

  return current && view ? { projectId: current, view } : null;
}

function frameStateOf(view: FrameStatesView | null, frameId: string): string {
  return view?.frames[frameId] ?? DEFAULT_FRAME_STATE;
}

function frameStateUrl(
  url: string | null,
  view: FrameStatesRead,
  frameId: string
): string | null {
  if (!url || view === undefined) {
    return null;
  }

  return view ? withFrameStateHost(url, frameStateOf(view, frameId)) : url;
}

async function setFrameState(
  projectId: string,
  frameId: string,
  state: string,
  mock?: FrameStateMock
): Promise<FrameStateDef> {
  const done = await call(routes.setFrameStateCanvas, {
    frame: frameId,
    projectId,
    state,
    ...(mock ? { mock } : {}),
  });

  store(projectId, done.view);

  return done.state;
}

async function setFrameSession(
  projectId: string,
  change: { user?: MockUser; forget?: boolean }
): Promise<void> {
  const view = await call(routes.updateFrameSessionCanvas, {
    projectId,
    ...(change.forget === undefined ? {} : { forget: change.forget }),
    ...(change.user ? { user: change.user } : {}),
  });

  store(projectId, view);
}

export {
  frameStateOf,
  frameStateUrl,
  setFrameSession,
  setFrameState,
  useCurrentFrameStates,
  useFrameStates,
};

export type { FrameStatesRead };
