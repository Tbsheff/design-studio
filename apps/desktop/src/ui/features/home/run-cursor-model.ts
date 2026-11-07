import type { RunSummary } from "@design-studio/contracts";
import type { MutableRefObject } from "react";

interface CursorState {
  readonly before: number | null;
  readonly isDone: boolean;
  readonly isLoading: boolean;
  readonly pending: Promise<void> | null;
}

interface RunCursor {
  readonly byDirection: Map<string, number>;
  readonly projectId: string;
  readonly seen: Set<string>;
  readonly state: MutableRefObject<CursorState>;
}

const createCursor = (id: string): RunCursor => ({
  byDirection: new Map(),
  projectId: id,
  seen: new Set(),
  state: {
    current: { before: null, isDone: false, isLoading: false, pending: null },
  },
});

const updateCursorSeen = (cursor: RunCursor, list: RunSummary[]): void => {
  for (const summary of list) {
    if (!cursor.seen.has(summary.id)) {
      cursor.seen.add(summary.id);
      cursor.byDirection.set(
        summary.directionId,
        (cursor.byDirection.get(summary.directionId) ?? 0) + 1
      );
    }
  }
};

const toLoadedCount = (
  cursor: RunCursor,
  directionId: string | null
): number => {
  if (directionId === null) {
    return cursor.seen.size;
  }

  return cursor.byDirection.get(directionId) ?? 0;
};

export { createCursor, toLoadedCount, updateCursorSeen };

export type { RunCursor };
