import type { Project } from "../../shared/contracts.js";
import { ConflictError } from "../store/errors.js";
import type { ProjectOpsRuntime } from "./project-ops-runtime.js";

interface MoveFailure {
  readonly error: string;
  readonly projectId: string;
}

interface HiddenMoved {
  readonly failed: readonly MoveFailure[];
  readonly moved: readonly string[];
}

interface HiddenCount {
  readonly count: number;
  readonly target: string;
}

const messageOf = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
};

const hiddenOf = async (runtime: ProjectOpsRuntime): Promise<Project[]> => {
  const all = await runtime.projects.list();

  return all.filter((project) => runtime.projects.isHidden(project));
};

const countHiddenIn = async (
  runtime: ProjectOpsRuntime
): Promise<HiddenCount> => {
  const hidden = await hiddenOf(runtime);

  return {
    count: hidden.length,
    target: await runtime.defaultFolder.current(),
  };
};

const moveOne = (
  runtime: ProjectOpsRuntime,
  project: Project,
  target: string
): Promise<Project> => {
  const main = runtime.projects.mainDirection(project);

  return runtime.directionLock(`${project.id}/${main.id}`, async () => {
    if (
      project.directions.some((direction) =>
        runtime.runner.isRunning(project.id, direction.id)
      )
    ) {
      throw new ConflictError("run_in_progress");
    }

    await runtime.preview.release(project, main);
    const next = await runtime.projects.moveIntoFolder(project.id, target);
    await runtime.preview.release(next, main);

    return next;
  });
};

const moveHiddenIn = async (
  runtime: ProjectOpsRuntime
): Promise<HiddenMoved> => {
  const hidden = await hiddenOf(runtime);
  const moved: string[] = [];
  const failed: MoveFailure[] = [];

  if (hidden.length === 0) {
    return { failed, moved };
  }

  const target = await runtime.defaultFolder.ensure();

  for (const project of hidden) {
    const main = runtime.projects.mainDirection(project);

    try {
      const updated = await moveOne(runtime, project, target);

      runtime.bus.emit({
        direction: runtime.projects.mainDirection(updated),
        directionId: main.id,
        projectId: project.id,
        type: "direction.updated",
      });
      moved.push(project.id);
    } catch (error) {
      console.error(`[http] could not move project ${project.id}`, error);
      failed.push({
        error: messageOf(error),
        projectId: project.id,
      });
    }
  }

  return { failed, moved };
};

export { countHiddenIn, moveHiddenIn };
