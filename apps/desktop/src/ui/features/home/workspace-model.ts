import type { Project } from "@design-studio/contracts";
import { isInsideFolder, shortenHome } from "@design-studio/contracts/folders";

import { copy } from "./copy.js";

type WorkspaceKind = "app" | "prototypes";

interface Workspace {
  readonly app: Project | null;
  readonly designSystems: readonly Project[];
  readonly folder: string | null;
  readonly id: string;
  readonly kind: WorkspaceKind;
  readonly name: string;
  readonly projects: readonly Project[];
  readonly prototypes: readonly Project[];
}

const PROTOTYPES_ID = "prototypes";
const RECENT_MAX = 3;
const WORKSPACE_KEYS = 9;
const MINUTE_MS = 60_000;
const HOUR_MS = 3_600_000;
const DAY_MS = 86_400_000;

const toFolder = (project: Project): string | null =>
  project.imported?.sourcePath ?? null;

const isVisible = (project: Project): boolean => !project.designSystemDeleted;

const isAppProject = (project: Project): boolean => Boolean(project.app);

const isDesignSystem = (project: Project): boolean =>
  Boolean(project.designSystemFor);

const isInFolder = (project: Project, folder: string | null): boolean => {
  const source = toFolder(project);

  if (source === null || folder === null) {
    return false;
  }

  return isInsideFolder(source, folder);
};

const toLastTouch = (project: Project): number =>
  Math.max(project.openedAt ?? 0, project.updatedAt);

const toByRecent = (projects: readonly Project[]): Project[] =>
  projects.toSorted((left, right) => toLastTouch(right) - toLastTouch(left));

const toAppWorkspace = (
  app: Project,
  visible: readonly Project[]
): Workspace => {
  const folder = toFolder(app);

  const members = visible.filter(
    (project) => project.id !== app.id && isInFolder(project, folder)
  );

  const designSystems = members.filter((project) => isDesignSystem(project));
  const prototypes = members.filter((project) => !isDesignSystem(project));
  const id = `app:${app.id}`;
  const kind: WorkspaceKind = "app";
  const { name } = app;
  const projects = toByRecent([app, ...members]);

  return { app, designSystems, folder, id, kind, name, projects, prototypes };
};

const toPrototypesWorkspace = (rest: readonly Project[]): Workspace => ({
  app: null,
  designSystems: rest.filter((project) => isDesignSystem(project)),
  folder: null,
  id: PROTOTYPES_ID,
  kind: "prototypes",
  name: copy.prototypesWorkspace,
  projects: toByRecent(rest),
  prototypes: rest.filter((project) => !isDesignSystem(project)),
});

const toWorkspaces = (projects: readonly Project[] | null): Workspace[] => {
  const visible = (projects ?? []).filter((project) => isVisible(project));

  const apps = visible
    .filter((project) => isAppProject(project))
    .toSorted((left, right) => left.name.localeCompare(right.name));

  const appSpaces = apps.map((app) => toAppWorkspace(app, visible));

  const claimed = new Set(
    appSpaces.flatMap((space) => space.projects.map((project) => project.id))
  );

  const rest = visible.filter((project) => !claimed.has(project.id));

  return [...appSpaces, toPrototypesWorkspace(rest)];
};

const toPinned = (projects: readonly Project[] | null): Project[] =>
  (projects ?? []).filter(
    (project) => isVisible(project) && project.settings.isPinned === true
  );

const toRecent = (projects: readonly Project[] | null): Project[] =>
  toByRecent((projects ?? []).filter((project) => isVisible(project))).slice(
    0,
    RECENT_MAX
  );

const toRecentIn = (workspace: Workspace | null): readonly Project[] =>
  workspace?.projects.slice(0, RECENT_MAX) ?? [];

const toAgo = (at: number, now: number): string => {
  const gap = Math.max(0, now - at);

  if (gap < MINUTE_MS) {
    return copy.justNow;
  }

  if (gap < HOUR_MS) {
    return `${Math.floor(gap / MINUTE_MS)}m`;
  }

  if (gap < DAY_MS) {
    return `${Math.floor(gap / HOUR_MS)}h`;
  }

  return `${Math.floor(gap / DAY_MS)}d`;
};

const toProjectAgo = (project: Project, now: number): string =>
  toAgo(toLastTouch(project), now);

const toWorkspaceKey = (index: number): string | null => {
  if (index >= WORKSPACE_KEYS) {
    return null;
  }

  return `⌘${index + 1}`;
};

const toWorkspaceSub = (
  workspace: Workspace,
  homeDir: string | null,
  packName: string | null
): string => {
  if (workspace.folder === null) {
    return copy.prototypesSub;
  }

  const parts = [copy.appFolder, shortenHome(workspace.folder, homeDir)];

  if (packName !== null) {
    parts.push(`${copy.designSystemLower} ${packName}`);
  }

  return parts.join(" · ");
};

type StarterId = "new" | "route" | "sample" | "template";

interface WorkspaceStarter {
  readonly id: StarterId;
  readonly sub: string;
  readonly title: string;
}

const toNewSub = (packName: string | null): string => {
  if (packName === null) {
    return copy.starterNewAppSub;
  }

  return `${copy.uses} ${packName}`;
};

const toStarters = (
  workspace: Workspace | null,
  packName: string | null
): readonly WorkspaceStarter[] => {
  if (workspace?.kind !== "app") {
    return [
      { id: "new", sub: copy.starterPrototypeSub, title: copy.newPrototype },
      { id: "sample", sub: copy.starterSampleSub, title: copy.openTheSample },
      {
        id: "template",
        sub: copy.starterTemplatePrototypeSub,
        title: copy.startFromATemplate,
      },
    ];
  }

  return [
    {
      id: "new",
      sub: toNewSub(packName),
      title: `${copy.newScreenIn} ${workspace.name}`,
    },
    { id: "route", sub: copy.starterRouteSub, title: copy.redesignARoute },
    {
      id: "template",
      sub: copy.starterTemplateAppSub,
      title: copy.startFromATemplate,
    },
  ];
};

const toIndexFor = (workspaces: readonly Workspace[], id: string): number => {
  const found = workspaces.findIndex((workspace) => workspace.id === id);

  return Math.max(0, found);
};

export {
  PROTOTYPES_ID,
  WORKSPACE_KEYS,
  toAgo,
  toIndexFor,
  toPinned,
  toProjectAgo,
  toRecent,
  toRecentIn,
  toStarters,
  toWorkspaceKey,
  toWorkspaceSub,
  toWorkspaces,
};

export type { StarterId, Workspace, WorkspaceKind, WorkspaceStarter };
