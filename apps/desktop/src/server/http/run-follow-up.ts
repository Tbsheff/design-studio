import type {
  Direction,
  Project,
  RunRequest,
  RunSummary,
} from "@design-studio/contracts";

import type {
  ProjectStore,
  RunHandle,
  VersionStore,
} from "../../shared/server-ports.js";
import { recordRunInHistory } from "../direct-edit/commit/index.js";
import type { EditHistory } from "../direct-edit/commit/index.js";
import type { DirectEditDeps } from "../direct-edit/index.js";
import { logError } from "../platform/logger/index.js";
import { applyRunPhotoArt } from "../share/index.js";

interface RunFollowUpDeps {
  readonly editDeps: DirectEditDeps;
  readonly editHistory: EditHistory;
  readonly projects: Pick<ProjectStore, "get">;
  readonly versions: VersionStore;
}

interface RunFollowUpTarget {
  readonly direction: Direction;
  readonly handle: RunHandle;
  readonly project: Project;
  readonly request: RunRequest;
}

const toSummary = async (handle: RunHandle): Promise<RunSummary | null> => {
  try {
    return await handle.done;
  } catch {
    return null;
  }
};

const applyRunHistory = async (
  deps: RunFollowUpDeps,
  target: RunFollowUpTarget,
  versionId: string
): Promise<boolean> => {
  try {
    await recordRunInHistory(
      deps.editHistory,
      deps.versions,
      target.project,
      target.direction,
      versionId
    );

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
  const summary = await toSummary(target.handle);

  if (summary === null) {
    deps.editHistory.clear(target.project.id, target.direction.id);

    return;
  }

  const versionId = summary.versionId ?? null;

  if (versionId !== null) {
    const isRecorded = await applyRunHistory(deps, target, versionId);

    if (isRecorded && target.request.mode === "edit") {
      await applyRunArt(deps, target);
    }
  }

  if (target.request.task || target.request.variation) {
    return;
  }

  try {
    return await next();
  } catch (error) {
    logError("[http] next queued run failed", error);
  }
};

export { applyRunFollowUp };
