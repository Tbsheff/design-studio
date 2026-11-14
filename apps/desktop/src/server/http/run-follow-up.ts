import type {
  Direction,
  Project,
  RunRequest,
  RunSummary,
} from "@design-studio/contracts";
import { PORT_TASK } from "@design-studio/contracts/port";

import type {
  ProjectStore,
  RunHandle,
  VersionStore,
} from "../../shared/server-ports.js";
import { toPortSteerRequest } from "../agent/index.js";
import {
  applyPortRunHistory,
  recordRunInHistory,
} from "../direct-edit/commit/index.js";
import type { EditHistory } from "../direct-edit/commit/index.js";
import type { DirectEditDeps } from "../direct-edit/index.js";
import { logError } from "../platform/logger/index.js";
import { applyRunPhotoArt } from "../share/index.js";

const PORT_QUEUE_LEAD =
  "The user sent this during the Move to app run. Apply it to the same routes:";

interface RunFollowUpDeps {
  readonly editDeps: DirectEditDeps;
  readonly editHistory: EditHistory;
  readonly projects: Pick<ProjectStore, "get">;
  readonly versions: VersionStore;
}

interface RunNext {
  readonly reason: "queue" | "steer";
  readonly text: string;
}

interface RunFollowUpTarget {
  readonly direction: Direction;
  readonly handle: RunHandle;
  readonly project: Project;
  readonly request: RunRequest;
}

const isPortRequest = (request: RunRequest): boolean =>
  request.task === PORT_TASK;

const toQueueRequest = (previous: RunRequest, text: string): RunRequest => {
  const request: RunRequest = { mode: previous.mode, prompt: text };

  if (previous.level) {
    request.level = previous.level;
  }

  if (previous.effort) {
    request.effort = previous.effort;
  }

  if (previous.canvas) {
    request.canvas = previous.canvas;
  }

  return request;
};

const toPortQueueRequest = (
  previous: RunRequest,
  queueText: string
): RunRequest =>
  ({
    ...previous,
    prompt: [previous.prompt, PORT_QUEUE_LEAD, queueText].join("\n\n"),
  }) satisfies RunRequest;

const toNextRequest = (
  previous: RunRequest,
  next: RunNext
): RunRequest | null => {
  if (!isPortRequest(previous)) {
    return toQueueRequest(previous, next.text);
  }

  if (next.reason === "queue") {
    return toPortQueueRequest(previous, next.text);
  }

  return toPortSteerRequest(previous, next.text);
};

const hasNoFollowUp = (request: RunRequest): boolean => {
  if (request.variation) {
    return true;
  }

  return Boolean(request.task) && !isPortRequest(request);
};

const toSummary = async (handle: RunHandle): Promise<RunSummary | null> => {
  try {
    return await handle.done;
  } catch {
    return null;
  }
};

interface RunRecordAt {
  readonly since: number;
  readonly versionId: string;
}

const applyRunEntry = async (
  deps: RunFollowUpDeps,
  target: RunFollowUpTarget,
  at: RunRecordAt
): Promise<void> => {
  const baseId = target.direction.headVersionId;

  if (isPortRequest(target.request) && baseId !== null) {
    await applyPortRunHistory(deps.editHistory, deps.versions, {
      baseId,
      direction: target.direction,
      project: target.project,
      since: at.since,
      versionId: at.versionId,
    });

    return;
  }

  await recordRunInHistory(
    deps.editHistory,
    deps.versions,
    target.project,
    target.direction,
    at.versionId
  );
};

const applyRunHistory = async (
  deps: RunFollowUpDeps,
  target: RunFollowUpTarget,
  at: RunRecordAt
): Promise<boolean> => {
  try {
    await applyRunEntry(deps, target, at);

    return true;
  } catch {
    deps.editHistory.clear(target.project.id, target.direction.id);

    return false;
  }
};

const applyRunArt = async (
  deps: RunFollowUpDeps,
  target: RunFollowUpTarget
): Promise<void> => {
  try {
    await applyRunPhotoArt(deps.editDeps, deps.projects, {
      directionId: target.direction.id,
      projectId: target.project.id,
    });
  } catch (error) {
    logError("[http] photo art failed", error);
  }
};

const applyRunFollowUp = async (
  deps: RunFollowUpDeps,
  target: RunFollowUpTarget,
  next: () => Promise<void>
): Promise<void> => {
  const since = deps.editHistory.mark();
  const summary = await toSummary(target.handle);

  if (summary === null) {
    deps.editHistory.clear(target.project.id, target.direction.id);

    return;
  }

  const versionId = summary.versionId ?? null;

  if (versionId !== null) {
    const isRecorded = await applyRunHistory(deps, target, {
      since,
      versionId,
    });

    if (isRecorded && target.request.mode === "edit") {
      await applyRunArt(deps, target);
    }
  }

  if (hasNoFollowUp(target.request)) {
    return;
  }

  try {
    return await next();
  } catch (error) {
    logError("[http] next queued run failed", error);
  }
};

export { applyRunFollowUp, toNextRequest };
