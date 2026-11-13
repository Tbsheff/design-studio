import { routes } from "@design-studio/actions/page/routes";
import { useCallback, useMemo, useTransition } from "react";

import { useAction } from "../../platform/query.js";
import type { CanvasFrame } from "./canvas-layout-types.js";
import {
  isRouteSourceChanged,
  toCopyFrame,
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

const useRouteSource = (setup: RouteSourceSetup): RouteSourceState => {
  const { activate, directionId, frames, path, projectId } = setup;

  const input = useMemo(
    () => toRouteSourceInput(projectId, directionId, path),
    [directionId, path, projectId]
  );

  const inspect = useAction(routes.inspectSourcePage, input);
  const importer = useAction(routes.importSourcePage);
  const { run } = importer;
  const [isPending, startTransition] = useTransition();
  const source = inspect.data;

  const handleCopy = useCallback((): void => {
    if (input === null) {
      return;
    }

    startTransition(async () => {
      await run(input);
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
