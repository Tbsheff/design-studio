import { useCallback, useEffect, useSyncExternalStore } from "react";

import { routes } from "../shared/actions/canvas/routes.js";
import type { StudioEvent } from "../shared/contracts";
import {
  DEFAULT_FRAME_STATE,
  DEFAULT_MOCK_USER,
  withFrameStateHost,
  type FrameStateDef,
  type FrameStatesView,
  type MockUser,
} from "../shared/frame-state";
import { useProjectEvents } from "./events";
import { call } from "./platform/http";
import type { RouteInput } from "./platform/http";

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
  states: [],
  frames: {},
  session: {
    user: { ...DEFAULT_MOCK_USER },
    usesMockUser: true,
    captured: [],
    capturedAt: null,
  },
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

export type FrameStatesRead = FrameStatesView | null | undefined;

export function useFrameStates(
  projectId: string,
  isApp: boolean
): FrameStatesRead {
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

export function useCurrentFrameStates(): {
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

export function frameStateOf(
  view: FrameStatesView | null,
  frameId: string
): string {
  return view?.frames[frameId] ?? DEFAULT_FRAME_STATE;
}

export function frameStateUrl(
  url: string | null,
  view: FrameStatesRead,
  frameId: string
): string | null {
  if (!url || view === undefined) {
    return null;
  }

  return view ? withFrameStateHost(url, frameStateOf(view, frameId)) : url;
}

export async function setFrameState(
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

export async function setFrameSession(
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
