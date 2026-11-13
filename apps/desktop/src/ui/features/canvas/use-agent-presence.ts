import { useEffect, useRef, useState } from "react";

import { toAgentName } from "../../domain/agent-names.js";
import { useProjectEvents } from "../../platform/events.js";
import {
  isFresh,
  toLiveMarks,
  toNextExpiry,
  toPresenceFrameId,
  withMark,
  withoutAgent,
} from "./agent-presence-model.js";
import type { PresenceMark, PresenceTarget } from "./agent-presence-model.js";
import type { CanvasFrames } from "./use-canvas-frames.js";

interface AgentPresenceInput {
  readonly directionId: string | null;
  readonly frames: CanvasFrames;
  readonly projectId: string;
}

interface AgentPresence {
  readonly marks: readonly PresenceMark[];
}

const IN_APP_AGENT = "Studio agent";

const useAgentPresence = (input: AgentPresenceInput): AgentPresence => {
  const [marks, setMarks] = useState<readonly PresenceMark[]>([]);
  const liveRuns = useRef<Set<string>>(new Set());
  const { layout } = input.frames;

  const place = (agent: string, at: number, target: PresenceTarget): void => {
    if (!isFresh(at, Date.now())) {
      return;
    }

    const frameId = toPresenceFrameId(
      {
        activeId: layout.activeId,
        directionId: input.directionId,
        frames: layout.frames,
      },
      target
    );

    if (frameId === null) {
      return;
    }

    const mark = { agent, at, frameId };
    setMarks((current) => withMark(current, mark));
  };

  useProjectEvents(input.projectId, (event) => {
    if (event.type === "mcp.activity") {
      place(toAgentName(event.activity.client), event.activity.at, {
        directionId: event.activity.directionId,
        frameId: event.activity.frameId,
      });
    }

    if (event.type === "run.tool.started") {
      liveRuns.current.add(event.runId);
      place(IN_APP_AGENT, event.ts, {
        directionId: event.directionId ?? null,
        frameId: null,
      });
    }

    if (event.type === "run.finished") {
      liveRuns.current.delete(event.runId);

      if (liveRuns.current.size === 0) {
        setMarks((current) => withoutAgent(current, IN_APP_AGENT));
      }
    }
  });

  useEffect(() => {
    if (marks.length === 0) {
      return;
    }

    const timer = globalThis.setTimeout(
      () => {
        setMarks((current) => toLiveMarks(current, Date.now()));
      },
      toNextExpiry(marks, Date.now())
    );

    return (): void => globalThis.clearTimeout(timer);
  }, [marks]);

  return { marks };
};

export { useAgentPresence };

export type { AgentPresence };
