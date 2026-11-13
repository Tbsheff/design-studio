import path from "node:path";

import { importProject } from "@design-studio/actions/project/import";
import type { Direction, Project } from "@design-studio/contracts";
import type { Schema } from "effect";

import { toTrimmedText } from "../../agent-tools/index.js";
import { callAction } from "../action-call.js";
import { approve, isTrustedFolder, oneLine } from "../edit-guards.js";
import type { EditDeps } from "../edit-guards.js";
import { toFieldTool, ok } from "../edit-kit.js";
import type { Done } from "../edit-kit.js";
import { isInside, safeFolder } from "../folders.js";
import {
  sameFolderOrRoot,
  workspaceFields,
  workspaceOf,
} from "../workspace-tools.js";

interface FolderAsk {
  readonly client: string;
  readonly detail: string;
}

type Workspace = Awaited<ReturnType<typeof workspaceOf>>;

type Opened = ReturnType<typeof workspaceFields> & {
  readonly alreadyOpen: boolean;
  readonly directionId: string | null;
  readonly folder: string;
  readonly kind: Project["kind"];
  readonly name: string;
  readonly projectId: string;
};

const PATH_MAX = 4096;

const FOLDER_TEXT_MAX = 160;

const NAME_TEXT_MAX = 60;

const OPEN_FOLDER_TEXT =
  "Open an existing folder as a Design Studio project, the same as Open folder on the studio Home. The studio then edits the files in that folder in place. The same folder rules as the studio apply, and system folders, the home folder itself and the studio data dir are refused. A folder outside the projects folder waits for the user to approve it in Design Studio. A folder that is already a project returns that project. A Next.js app folder inside a monorepo (pnpm-workspace.yaml, turbo.json or package.json workspaces) opens at the workspace root with that folder as appDir, so the shared kit, Tailwind CSS and root DESIGN.md are found; the result has workspaceRoot and appDir (workspaceRoot is null outside a monorepo).";

const openFolderFields = {
  path: toTrimmedText(1, PATH_MAX).annotate({
    description:
      "Absolute path (or ~/...) of a folder with an index.html, a Vite app, or an app with a token CSS file.",
  }),
};

const toProjectsFolder = async (deps: EditDeps): Promise<string | null> => {
  try {
    const raw = await deps.projectsFolder();

    return await safeFolder(raw, deps.dataDir);
  } catch {
    return null;
  }
};

const confirmFolder = async (
  deps: EditDeps,
  folder: string,
  ask: FolderAsk
): Promise<void> => {
  const projects = await toProjectsFolder(deps);

  if (projects !== null && isInside(folder, projects)) {
    return;
  }

  if (await isTrustedFolder(deps, folder)) {
    return;
  }

  await approve(deps, {
    action: "Open a folder as a project",
    client: ask.client,
    detail: ask.detail,
    projectId: null,
    title: `${ask.client} wants to open ${oneLine(folder, FOLDER_TEXT_MAX)} as a project`,
    tool: "open_folder",
  });
};

const mainOf = (project: Project): Direction | null =>
  project.directions.find((direction) => direction.id === "main") ??
  project.directions[0] ??
  null;

const toScope = (workspace: Workspace): string => {
  if (workspace) {
    return `the ${workspace.name} monorepo at ${workspace.root}`;
  }

  return "this folder";
};

const toOpened = (
  project: Project,
  folder: string,
  isOpen: boolean
): Opened => ({
  alreadyOpen: isOpen,
  directionId: mainOf(project)?.id ?? null,
  folder,
  kind: project.kind,
  name: project.name,
  projectId: project.id,
  ...workspaceFields(project, folder),
});

const findOpen = async (
  deps: EditDeps,
  folder: string,
  workspace: Workspace
): Promise<Project | null> => {
  const projects = await deps.projects.list();

  return (
    projects.find(
      (project) =>
        !project.designSystemDeleted &&
        sameFolderOrRoot(project, folder, workspace)
    ) ?? null
  );
};

const importFolder = async (deps: EditDeps, folder: string): Promise<Done> => {
  const { project } = await callAction<{ project: Project }>(
    deps,
    importProject,
    { path: folder }
  );

  return {
    activity: {
      directionId: mainOf(project)?.id ?? null,
      projectId: project.id,
      summary: `Opened folder ${oneLine(path.basename(folder), NAME_TEXT_MAX)}`,
    },
    result: ok(toOpened(project, folder, false)),
  };
};

const openFolder = async (
  deps: EditDeps,
  input: Schema.Struct.Type<typeof openFolderFields>,
  client: string
): Promise<Done> => {
  const folder = await safeFolder(input.path, deps.dataDir);
  const workspace = await workspaceOf(folder);

  await confirmFolder(deps, folder, {
    client,
    detail: `Design Studio and outside agents with Allow edits on can then change the files in ${toScope(workspace)}.`,
  });

  const existing = await findOpen(deps, folder, workspace);

  if (existing) {
    return { result: ok(toOpened(existing, folder, true)) };
  }

  return importFolder(deps, folder);
};

const openFolderTool = toFieldTool(
  "open_folder",
  openFolderFields,
  { description: OPEN_FOLDER_TEXT, title: "Open folder as project" },
  openFolder
);

export { openFolderTool };
