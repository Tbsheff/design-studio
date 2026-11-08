import path from "node:path";

import type { Project } from "@design-studio/contracts";

import { assertSafeId } from "../platform/errors/index.js";
import type { StudioProjectStore } from "../store/index.js";

interface ShipActivityDraft {
  readonly directionId: string;
  readonly projectId: string;
  readonly summary: string;
}

interface ShipActivity {
  readonly record: (
    tool: string,
    client: string,
    draft: ShipActivityDraft
  ) => Promise<object>;
}

interface ShipRunCheck {
  readonly isRunning: (projectId: string, directionId: string) => boolean;
}

interface ShipRuntime {
  readonly activity: ShipActivity;
  readonly projects: StudioProjectStore;
  readonly runner: ShipRunCheck;
}

interface ShipTarget {
  readonly dataDir: string;
  readonly project: Project;
  readonly projectDir: string;
  readonly runtime: ShipRuntime;
}

const toProjectDir = (dataDir: string, projectId: string): string =>
  path.join(dataDir, "projects", assertSafeId(projectId, "projectId"));

const getTarget = async (
  root: string,
  current: ShipRuntime,
  projectId: string
): Promise<ShipTarget> => {
  const found = await current.projects.get(projectId);

  return {
    dataDir: root,
    project: found,
    projectDir: toProjectDir(root, found.id),
    runtime: current,
  };
};

const runOnTarget = async <Value>(
  root: string,
  current: ShipRuntime,
  projectId: string,
  task: (target: ShipTarget) => Promise<Value>
): Promise<Value> => task(await getTarget(root, current, projectId));

export { runOnTarget };

export type { ShipRuntime, ShipTarget };
