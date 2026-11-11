import path from "node:path";

import type {
  LinkedFolder,
  Project,
  ProjectKind,
  ProjectSettings,
} from "@design-studio/contracts";

import type { ProjectCore } from "./project-core.js";
import {
  hasViteDependency,
  readJson,
  resolveUserFolder,
} from "./project-helpers.js";

type CreateProject = (input: {
  name: string;
  kind: ProjectKind;
  settings?: Partial<ProjectSettings>;
}) => Promise<Project>;

interface ProjectFolderLink {
  readonly linkFolder: (sourcePath: string) => Promise<Project>;
}

const NAME_MAX = 120;
const LOCK_PREFIX = "folder-link:";

const isLinkedTo = (project: Project, folder: string): boolean =>
  project.folder?.path === folder ||
  (Boolean(project.app) && project.imported?.sourcePath === folder);

const isViteFolder = async (folder: string): Promise<boolean> => {
  try {
    return hasViteDependency(await readJson(path.join(folder, "package.json")));
  } catch {
    return false;
  }
};

const toFolderKind = async (
  core: ProjectCore,
  folder: string
): Promise<LinkedFolder["kind"]> => {
  const detected = await core.apps.detectApp(folder);

  if (detected.framework !== null || detected.candidates.length > 0) {
    return "app";
  }

  if (await isViteFolder(folder)) {
    return "app";
  }

  return "folder";
};

const createFolderLink = async (
  core: ProjectCore,
  create: CreateProject,
  folder: string
): Promise<Project> => {
  const [projects, kind] = await Promise.all([
    core.list(),
    toFolderKind(core, folder),
  ]);

  const existing = projects.find((project) => isLinkedTo(project, folder));

  if (existing) {
    return existing;
  }

  const project = await create({
    kind: "html",
    name: path.basename(folder).slice(0, NAME_MAX),
  });

  project.folder = { kind, path: folder };
  await core.writeProject(project);

  return project;
};

const createProjectFolderLink = (
  core: ProjectCore,
  create: CreateProject
): ProjectFolderLink => ({
  async linkFolder(sourcePath: string): Promise<Project> {
    const folder = await resolveUserFolder(core.config.dataDir, sourcePath);

    return core.lock(`${LOCK_PREFIX}${folder}`, () =>
      createFolderLink(core, create, folder)
    );
  },
});

export { createProjectFolderLink };
