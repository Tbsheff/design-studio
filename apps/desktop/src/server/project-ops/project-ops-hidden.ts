import type { Project } from "@design-studio/actions/_core/contracts";
import { ConflictError } from "../platform/errors/index.js";
import { logError } from "../platform/logger/index.js";
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

interface MoveState {
  readonly failed: MoveFailure[];
  readonly moved: string[];
  readonly target: string;
}

const moveOneSafely = async (
  runtime: ProjectOpsRuntime,
  state: MoveState,
  project: Project
): Promise<void> => {
  const main = runtime.projects.mainDirection(project);

  try {
    const updated = await moveOne(runtime, project, state.target);

    runtime.bus.emit({
      direction: runtime.projects.mainDirection(updated),
      directionId: main.id,
      projectId: project.id,
      type: "direction.updated",
    });
    state.moved.push(project.id);
  } catch (error) {
    logError(`[http] could not move project ${project.id}`, error);

    if (error instanceof Error) {
      state.failed.push({ error: error.message, projectId: project.id });

      return;
    }

    state.failed.push({ error: String(error), projectId: project.id });
  }
};

const moveFrom = async (
  runtime: ProjectOpsRuntime,
  state: MoveState,
  projects: readonly Project[],
  index: number
): Promise<void> => {
  const project = projects[index];

  if (!project) {
    return;
  }

  await moveOneSafely(runtime, state, project);
  await moveFrom(runtime, state, projects, index + 1);
};

const moveHiddenIn = async (
  runtime: ProjectOpsRuntime
): Promise<HiddenMoved> => {
  const hidden = await hiddenOf(runtime);

  if (hidden.length === 0) {
    return { failed: [], moved: [] };
  }

  const state: MoveState = {
    failed: [],
    moved: [],
    target: await runtime.defaultFolder.ensure(),
  };

  await moveFrom(runtime, state, hidden, 0);

  return { failed: state.failed, moved: state.moved };
};

export { countHiddenIn, moveHiddenIn };

export type { HiddenCount, HiddenMoved };
