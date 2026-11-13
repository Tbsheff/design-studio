import { routes } from "@design-studio/actions/page/routes";
import {
  useCallback,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useTransition,
} from "react";

import { subscribeDone, useAction } from "../../platform/query.js";
import type { CanvasFrame } from "./canvas-layout-types.js";
import {
  isRouteSourceChanged,
  toCopyFrame,
  toFrameById,
  toRouteSourceInput,
  toRouteSourceTip,
} from "./route-source-model.js";

interface RouteSourceSetup {
  readonly activate: (frame: CanvasFrame) => void;
  readonly directionId: string | null;
  readonly frames: readonly CanvasFrame[];
  readonly path: string | null;
  readonly projectId: string;
}

interface RouteSourceState {
  readonly copyFrame: CanvasFrame | null;
  readonly error: string | null;
  readonly isChanged: boolean;
  readonly isPending: boolean;
  readonly tip: string;
  readonly handleCompare: () => void;
  readonly handleCopy: () => void;
}

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
  const { activate, directionId, frames, path, projectId } = setup;

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
    if (copyFrame !== null) {
      activate(copyFrame);
    }
  }, [activate, copyFrame]);

  const error = importer.error?.message ?? null;
  const isChanged = isRouteSourceChanged(source);
  const tip = toRouteSourceTip(source);

  return {
    copyFrame,
    error,
    handleCompare,
    handleCopy,
    isChanged,
    isPending,
    tip,
  };
};

export { useRouteSource };

export type { RouteSourceState };
