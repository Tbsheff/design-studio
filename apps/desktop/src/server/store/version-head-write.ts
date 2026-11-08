import type { Version, WorkTreeStatus } from "@design-studio/contracts";

import { BadRequestError } from "../platform/errors/index.js";
import type { VersionWriteRuntime } from "./version-write-core.js";
import type { DirectionRef } from "./version-write.js";

const KEEP_TITLE = "Kept unfinished changes";

const restoreHeadOf = (
  runtime: VersionWriteRuntime,
  query: DirectionRef
): Promise<Version> =>
  runtime.withDirection(
    query.projectId,
    query.directionId,
    async (project, direction) => {
      const restored = await runtime.versions.restore(
        project,
        direction,
        "head",
        "undo"
      );

      await runtime.recordVersion(project, direction, restored, "undo");
      await runtime.syncPackId(project, direction);
      await runtime.emitStatus(project, direction);

      return restored;
    }
  );

const createKeptVersion = (
  runtime: VersionWriteRuntime,
  query: DirectionRef
): Promise<Version> =>
  runtime.withDirection(
    query.projectId,
    query.directionId,
    async (project, direction) => {
      const kept = await runtime.versions.commit(
        project,
        direction,
        KEEP_TITLE,
        { kind: "keep" }
      );

      if (kept === null) {
        throw new BadRequestError("no unfinished changes to keep");
      }

      await runtime.recordVersion(project, direction, kept);
      await runtime.emitStatus(project, direction);

      return kept;
    }
  );

const restoreWorkTreeOf = (
  runtime: VersionWriteRuntime,
  query: DirectionRef
): Promise<WorkTreeStatus> =>
  runtime.withDirection(
    query.projectId,
    query.directionId,
    async (project, direction) => {
      const discarded = await runtime.versions.discard(project, direction);

      runtime.editDeps.bus.emit({
        directionId: direction.id,
        projectId: project.id,
        status: discarded,
        type: "status.changed",
      });

      return discarded;
    }
  );

export { restoreWorkTreeOf, createKeptVersion, restoreHeadOf };
