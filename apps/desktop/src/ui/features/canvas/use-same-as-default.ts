import { routes } from "@design-studio/actions/canvas/routes";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";

import { useAction } from "../../platform/query.js";
import { canvasStore } from "./canvas-frames-model.js";
import { isStateBoardSection, toBoardFrameId } from "./state-check-model.js";

const SAME_THRESHOLD = 0.98;

const DEFAULT_STATE = "default";

const toBoardId = (projectId: string, frameId: string): string | null => {
  const frames = canvasStore.get(projectId)?.frames ?? [];
  const frame = frames.find((item) => item.id === frameId);

  if (!frame || frame.hidden === true) {
    return null;
  }

  const section = canvasStore
    .sections(projectId)
    .find(
      (item) =>
        isStateBoardSection(item) && toBoardFrameId([frame], item) === frameId
    );

  if (!section) {
    return null;
  }

  return toBoardFrameId(frames, section);
};

interface SameAsDefaultInput {
  readonly frameId: string;
  readonly headVersionId: string | null;
  readonly projectId: string;
}

const useVersionRecheck = (
  headVersionId: string | null,
  refetch: () => Promise<void>
): void => {
  const seen = useRef(headVersionId);

  useEffect(() => {
    if (seen.current === headVersionId) {
      return;
    }

    seen.current = headVersionId;
    void refetch();
  }, [headVersionId, refetch]);
};

const useSameAsDefault = (input: SameAsDefaultInput): boolean => {
  const { frameId, headVersionId, projectId } = input;

  const boardId = useSyncExternalStore(canvasStore.subscribe, () =>
    toBoardId(projectId, frameId)
  );

  const query = useMemo(() => {
    if (boardId === null) {
      return null;
    }

    const threshold = SAME_THRESHOLD;

    return { frame: boardId, projectId, threshold };
  }, [boardId, projectId]);

  const { data, refetch } = useAction(routes.inspectStateFramesCanvas, query);

  useVersionRecheck(headVersionId, refetch);

  if (query === null || data === null) {
    return false;
  }

  return data.items.some(
    (row) =>
      row.frameId === frameId &&
      row.state !== DEFAULT_STATE &&
      row.isSameAsDefault
  );
};

export { useSameAsDefault };
