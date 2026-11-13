import type { Project } from "@design-studio/contracts";
import { isInsideFolder, shortenHome } from "@design-studio/contracts/folders";

import { copy } from "./copy.js";

type WorkspaceKind = "app" | "folder" | "prototypes";

interface Workspace {
  readonly anchor: Project | null;
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
  project.folder?.path ?? project.imported?.sourcePath ?? null;

const isVisible = (project: Project): boolean => !project.designSystemDeleted;

const isAppProject = (project: Project): boolean => Boolean(project.app);

const isFolderLink = (project: Project): boolean => Boolean(project.folder);

const isListed = (project: Project): boolean =>
  isVisible(project) && !isFolderLink(project);

const isDesignSystem = (project: Project): boolean =>
  Boolean(project.designSystemFor);

const isLinkedTo = (project: Project, ids: ReadonlySet<string>): boolean =>
  ids.has(project.appProjectId ?? "");

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

const toLinkIds = (anchor: Project, app: Project | null): Set<string> => {
  const ids = new Set([anchor.id]);

  if (app !== null) {
    ids.add(app.id);
  }

  return ids;
};

const toKind = (anchor: Project, app: Project | null): WorkspaceKind => {
  if (app !== null || anchor.folder?.kind === "app") {
    return "app";
  }

  return "folder";
};

const toAppProjects = (app: Project | null): Project[] => {
  if (app === null) {
    return [];
  }

  return [app];
};

const toFolderWorkspace = (
  anchor: Project,
  app: Project | null,
  visible: readonly Project[]
): Workspace => {
  const folder = toFolder(anchor);
  const ids = toLinkIds(anchor, app);

  const members = visible.filter(
    (project) =>
      !ids.has(project.id) &&
      !isFolderLink(project) &&
      (isLinkedTo(project, ids) || isInFolder(project, folder))
  );

  const designSystems = members.filter((project) => isDesignSystem(project));
  const prototypes = members.filter((project) => !isDesignSystem(project));
  const id = `${toKind(anchor, app)}:${anchor.id}`;
  const kind = toKind(anchor, app);
  const { name } = anchor;
  const projects = toByRecent([...toAppProjects(app), ...members]);

  return {
    anchor,
    app,
    designSystems,
    folder,
    id,
    kind,
    name,
    projects,
    prototypes,
  };
};

const toAppFor = (anchor: Project, apps: readonly Project[]): Project | null =>
  apps.find((app) => toFolder(app) === toFolder(anchor)) ?? null;

const toPrototypesWorkspace = (rest: readonly Project[]): Workspace => ({
  anchor: null,
  app: null,
  designSystems: rest.filter((project) => isDesignSystem(project)),
  folder: null,
  id: PROTOTYPES_ID,
  kind: "prototypes",
  name: copy.prototypesWorkspace,
  projects: toByRecent(rest),
  prototypes: rest.filter((project) => !isDesignSystem(project)),
});

const toClaimedIds = (space: Workspace): string[] => [
  space.anchor?.id ?? "",
  space.app?.id ?? "",
  ...space.projects.map((project) => project.id),
];

const toWorkspaces = (projects: readonly Project[] | null): Workspace[] => {
  const visible = (projects ?? []).filter((project) => isVisible(project));

  const apps = visible.filter((project) => isAppProject(project));
  const links = visible.filter((project) => isFolderLink(project));

  const linkSpaces = links.map((link) =>
    toFolderWorkspace(link, toAppFor(link, apps), visible)
  );

  const linkedApps = new Set(
    linkSpaces.flatMap((space) => toAppProjects(space.app))
  );

  const appSpaces: Workspace[] = [];

  for (const app of apps) {
    if (!linkedApps.has(app)) {
      appSpaces.push(toFolderWorkspace(app, app, visible));
    }
  }

  const spaces = [...linkSpaces, ...appSpaces].toSorted((left, right) =>
    left.name.localeCompare(right.name)
  );

  const claimed = new Set(spaces.flatMap((space) => toClaimedIds(space)));

  const rest = visible.filter(
    (project) => !claimed.has(project.id) && !isFolderLink(project)
  );

  return [...spaces, toPrototypesWorkspace(rest)];
};

const toPinned = (projects: readonly Project[] | null): Project[] =>
  (projects ?? []).filter(
    (project) => isListed(project) && project.settings.isPinned === true
  );

const toRecent = (projects: readonly Project[] | null): Project[] =>
  toByRecent(
    (projects ?? []).filter(
      (project) => isListed(project) && project.settings.isPinned !== true
    )
  ).slice(0, RECENT_MAX);

const toListedProjects = (projects: readonly Project[]): Project[] =>
  projects.filter((project) => !isFolderLink(project));

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

const toFolderLabel = (workspace: Workspace): string => {
  if (workspace.kind === "app") {
    return copy.appFolder;
  }

  return copy.folderLabel;
};

const toWorkspaceSub = (
  workspace: Workspace,
  homeDir: string | null,
  packName: string | null
): string => {
  if (workspace.folder === null) {
    return copy.prototypesSub;
  }

  const parts = [
    toFolderLabel(workspace),
    shortenHome(workspace.folder, homeDir),
  ];

  if (packName !== null) {
    parts.push(`${copy.designSystemLower} ${packName}`);
  }

  return parts.join(" · ");
};

type StarterId = "edit" | "new" | "prototype" | "sample" | "template";

interface WorkspaceStarter {
  readonly id: StarterId;
  readonly sub: string;
  readonly title: string;
}

const PROTOTYPE_STARTER: WorkspaceStarter = {
  id: "prototype",
  sub: copy.starterBesideSub,
  title: copy.newPrototype,
};

const EDIT_STARTER: WorkspaceStarter = {
  id: "edit",
  sub: copy.starterEditAppSub,
  title: copy.editApp,
};

const toStarters = (
  workspace: Workspace | null
): readonly WorkspaceStarter[] => {
  if (workspace === null || workspace.kind === "prototypes") {
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

  if (workspace.kind === "folder") {
    return [PROTOTYPE_STARTER];
  }

  return [PROTOTYPE_STARTER, EDIT_STARTER];
};

const isFolderWorkspace = (workspace: Workspace | null): boolean =>
  workspace !== null && workspace.kind !== "prototypes";

const toDefaultLine = (
  workspace: Workspace | null,
  isEditApp: boolean
): string | null => {
  if (!isFolderWorkspace(workspace)) {
    return null;
  }

  if (isEditApp && workspace?.kind === "app") {
    return copy.promptsEditApp;
  }

  return null;
};

const toIndexFor = (workspaces: readonly Workspace[], id: string): number => {
  const found = workspaces.findIndex((workspace) => workspace.id === id);

  if (found !== -1) {
    return found;
  }

  return Math.max(
    0,
    workspaces.findIndex((workspace) => workspace.id === PROTOTYPES_ID)
  );
};

export {
  PROTOTYPES_ID,
  WORKSPACE_KEYS,
  isFolderWorkspace,
  toAgo,
  toDefaultLine,
  toIndexFor,
  toListedProjects,
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
