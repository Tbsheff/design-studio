import type { Project } from "@design-studio/contracts";

import type { ProjectStore, VersionStore } from "../../shared/server-ports.js";
import { isPlayable } from "./play-data.js";
import type { PlayDataDeps } from "./play-data.js";
import { toRootCache } from "./play-files.js";
import { toShellParts } from "./play-shell.js";
import type { ShellParts } from "./play-shell.js";
import type { ShareRecord, ShareStore } from "./store.js";

interface PlayAppDeps {
  readonly projects: Pick<ProjectStore, "get" | "projectDir">;
  readonly shares: ShareStore;
  readonly uiDir: string;
  readonly versions: Pick<VersionStore, "snapshot">;
}

interface PlayTarget {
  readonly project: Project;
  readonly record: ShareRecord;
}

interface PlayTargets {
  readonly dataDeps: PlayDataDeps;
  readonly toRoot: (target: PlayTarget) => Promise<string>;
  readonly toShell: () => Promise<ShellParts | null>;
  readonly toTarget: (token: string) => Promise<PlayTarget | null>;
  readonly uiDir: string;
}

const toProject = async (
  deps: PlayAppDeps,
  projectId: string
): Promise<Project | null> => {
  try {
    return await deps.projects.get(projectId);
  } catch {
    return null;
  }
};

const toPlayTarget = async (
  deps: PlayAppDeps,
  token: string
): Promise<PlayTarget | null> => {
  const record = await deps.shares.byToken(token);

  if (record === null) {
    return null;
  }

  const project = await toProject(deps, record.projectId);

  if (project === null || !isPlayable(project)) {
    return null;
  }

  return { project, record };
};

const createPlayTargets = (deps: PlayAppDeps): PlayTargets => {
  const roots = toRootCache();
  let shell: Promise<ShellParts | null> | null = null;

  const toShell = async (): Promise<ShellParts | null> => {
    shell ??= toShellParts(deps.uiDir);
    const parts = await shell;

    if (parts === null) {
      shell = null;
    }

    return parts;
  };

  const toRoot = (target: PlayTarget): Promise<string> => {
    const key = `${target.project.id}/${target.record.versionId}`;
    const known = roots.get(key);

    if (known !== null) {
      return known;
    }

    const made = deps.versions.snapshot(
      target.project,
      target.record.versionId
    );

    roots.set(key, made);

    return made;
  };

  const dataDeps: PlayDataDeps = {
    projectDir: (projectId) => deps.projects.projectDir(projectId),
  };

  const toTarget = (token: string): Promise<PlayTarget | null> =>
    toPlayTarget(deps, token);

  return { dataDeps, toRoot, toShell, toTarget, uiDir: deps.uiDir };
};

export { createPlayTargets };

export type { PlayAppDeps, PlayTarget, PlayTargets };
