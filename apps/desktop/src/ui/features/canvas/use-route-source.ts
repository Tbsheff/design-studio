import { routes } from "@design-studio/actions/page/routes";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useTransition,
} from "react";

import { selectionRun, sendSelectionPrompt } from "../../platform/ask-chat.js";
import { useLive } from "../../platform/live-store.js";
import { subscribeDone, useAction } from "../../platform/query.js";
import type { CanvasFrame } from "./canvas-layout-types.js";
import { setSelectedIds } from "./frame-selection-store.js";
import { requestFrameZoom } from "./frame-zoom-store.js";
import {
  isRouteSourceChanged,
  toCopyFrame,
  toFrameById,
  toRouteMergePrompt,
  toRouteSourceInput,
  toRouteSourceTip,
} from "./route-source-model.js";
import type { RouteSourceInput } from "./route-source-model.js";

interface RouteSourceSetup {
  readonly activate: (frame: CanvasFrame) => void;
  readonly directionId: string | null;
  readonly frameId: string;
  readonly frames: readonly CanvasFrame[];
  readonly path: string | null;
  readonly projectId: string;
}

interface RouteSourceState {
  readonly copyFrame: CanvasFrame | null;
  readonly error: string | null;
  readonly input: RouteSourceInput | null;
  readonly isChanged: boolean;
  readonly isPending: boolean;
  readonly tip: string;
  readonly handleCompare: () => void;
  readonly handleCopy: () => void;
}

interface RouteMergeState {
  readonly error: string | null;
  readonly isPending: boolean;
  readonly isRunning: boolean;
  readonly handleMark: () => void;
  readonly handleUpdate: () => void;
}

const useRouteMerge = (input: RouteSourceInput | null): RouteMergeState => {
  const setter = useAction(routes.setSourcePage);
  const { run } = setter;
  const isRunning = useLive(selectionRun);
  const [isPending, startTransition] = useTransition();

  const handleUpdate = useCallback((): void => {
    if (input !== null) {
      sendSelectionPrompt(toRouteMergePrompt(input.file));
    }
  }, [input]);

  const handleMark = useCallback((): void => {
    if (input === null) {
      return;
    }

    startTransition(async () => {
      await run(input);
    });
  }, [input, run]);

  return {
    error: setter.error?.message ?? null,
    handleMark,
    handleUpdate,
    isPending,
    isRunning,
  };
};

const toNoCleanup = (): null => null;

const useAppDoneRefetch = (
  appProjectId: string | null,
  refetch: () => Promise<void>
): void => {
  useEffect(() => {
    if (appProjectId === null) {
      return toNoCleanup;
    }

    return subscribeDone((done): void => {
      if (done.projectId === appProjectId) {
        void refetch();
      }
    });
  }, [appProjectId, refetch]);
};

const useRouteSource = (setup: RouteSourceSetup): RouteSourceState => {
  const { activate, directionId, frameId, frames, path, projectId } = setup;

  const input = useMemo(
    () => toRouteSourceInput(projectId, directionId, path),
    [directionId, path, projectId]
  );

  const inspect = useAction(routes.inspectSourcePage, input);
  const importer = useAction(routes.importSourcePage);
  const { run } = importer;
  const { refetch } = inspect;
  const [isPending, startTransition] = useTransition();
  const pendingFrameId = useRef<string | null>(null);
  const source = inspect.data;
  const appProjectId = source?.appProjectId ?? null;

  useAppDoneRefetch(appProjectId, refetch);

  const showFrame = useEffectEvent((frame: CanvasFrame): void => {
    pendingFrameId.current = null;
    activate(frame);
  });

  useEffect(() => {
    const frame = toFrameById(frames, pendingFrameId.current);

    if (frame !== null) {
      showFrame(frame);
    }
  });

  const handleCopy = useCallback((): void => {
    if (input === null) {
      return;
    }

    startTransition(async () => {
      const imported = await run(input);
      pendingFrameId.current = imported?.frameId ?? null;
    });
  }, [input, run]);

  const copyFrame = useMemo(() => {
    if (input === null) {
      return null;
    }

    return toCopyFrame(frames, input.file);
  }, [frames, input]);

  const handleCompare = useCallback((): void => {
    if (copyFrame === null) {
      return;
    }

    const ids = [frameId, copyFrame.id];

    setSelectedIds(projectId, ids);
    requestFrameZoom(projectId, ids);
  }, [copyFrame, frameId, projectId]);

  const error = importer.error?.message ?? null;
  const isChanged = isRouteSourceChanged(source);
  const tip = toRouteSourceTip(source);

  return {
    copyFrame,
    error,
    handleCompare,
    handleCopy,
    input,
    isChanged,
    isPending,
    tip,
  };
};

export { useRouteMerge, useRouteSource };

export type { RouteMergeState, RouteSourceState };
