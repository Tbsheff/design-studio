import { routes as portRoutes } from "@design-studio/actions/port/routes";
import type { PortMatchWire } from "@design-studio/actions/port/schema";
import { routes as runRoutes } from "@design-studio/actions/run/routes";
import { PORT_TASK } from "@design-studio/contracts/port";
import { useCallback, useMemo, useTransition } from "react";

import { useAction } from "../../platform/query.js";
import { useUi } from "../../platform/storage.js";
import {
  toFixPrompt,
  toPortCheckInput,
  toPortCheckTag,
} from "./port-check-model.js";
import type { RunView } from "./run-state-model.js";

interface PortCheckState {
  readonly error: string | null;
  readonly isChecking: boolean;
  readonly isPending: boolean;
  readonly match: PortMatchWire | null;
  readonly onFix: () => void;
}

const usePortCheck = (run: RunView): PortCheckState => {
  const { activeProjectId } = useUi();
  const [isPending, startTransition] = useTransition();
  const { request, status, directionId } = run;
  const isDone = status === "completed";

  const input = useMemo(() => {
    if (!isDone) {
      return null;
    }

    return toPortCheckInput(request);
  }, [isDone, request]);

  const read = useAction(portRoutes.inspectPort, input);
  const starter = useAction(runRoutes.startRun);
  const { run: startRun } = starter;
  const match = read.data ?? null;

  const onFix = useCallback((): void => {
    const tag = toPortCheckTag(request);

    if (match === null || tag === null || activeProjectId === null) {
      return;
    }

    if (directionId === null) {
      return;
    }

    const prompt = toFixPrompt(match, tag);
    const projectId = activeProjectId;
    const mode = "edit";
    const task = PORT_TASK;

    startTransition(async () => {
      await startRun({
        directionId,
        mode,
        projectId,
        prompt,
        task,
      });
    });
  }, [activeProjectId, directionId, match, request, startRun]);

  return {
    error: read.error?.message ?? starter.error?.message ?? null,
    isChecking: input !== null && match === null && read.error === null,
    isPending,
    match,
    onFix,
  };
};

export { usePortCheck };

export type { PortCheckState };
