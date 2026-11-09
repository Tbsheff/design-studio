import type { ProjectStore } from "../../shared/server-ports.js";
import { getFileLocks } from "../store/index.js";
import type { RunDriver } from "./lifecycle.js";

type ProjectDirOf = Pick<ProjectStore, "projectDir">;

const toLockedDriver =
  (driver: RunDriver, projects: ProjectDirOf): RunDriver =>
  async (input) => {
    const lockedPaths = await getFileLocks(
      projects.projectDir(input.ctx.project.id),
      input.ctx.direction.id
    );

    return driver({ ...input, ctx: { ...input.ctx, lockedPaths } });
  };

export { toLockedDriver };
