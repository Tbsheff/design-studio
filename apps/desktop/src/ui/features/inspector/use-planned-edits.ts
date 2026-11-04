import { useRef } from "react";

import type { StudioEvent } from "../../../shared/actions/_core/contracts.js";
import { useProjectEvents } from "../../platform/events.js";
import { postToLiveFrames } from "../design-system/token-frames.js";

const FRESH_MS = 5000;

const patchIds = (id: string, count: number): string[] =>
  Array.from({ length: count }, (_, index) => `${id}:${index}`);

export const usePlannedEdits = (
  projectId: string,
  directionId: string | null,
  live: boolean
): void => {
  const counts = useRef(new Map<string, number>());
  useProjectEvents(projectId, (event: StudioEvent) => {
    if (
      !live ||
      !directionId ||
      event.directionId !== directionId ||
      Date.now() - event.ts > FRESH_MS
    ) {
      return;
    }

    if (event.type === "edit.planned") {
      if (counts.current.size > 200) {
        counts.current.clear();
      }

      counts.current.set(event.id, event.patches.length);
      event.patches.forEach((patch, index) =>
        postToLiveFrames({
          id: `${event.id}:${index}`,
          patch: { ...patch, trusted: false },
          type: "optimistic-apply",
          written: true,
        })
      );
    }

    if (event.type === "edit.unplanned") {
      for (const id of patchIds(event.id, counts.current.get(event.id) ?? 0)) {
        postToLiveFrames({
          id,
          ok: false,
          reason: "The edit was not saved.",
          type: "optimistic-settle",
        });
      }

      counts.current.delete(event.id);
    }
  });
};
