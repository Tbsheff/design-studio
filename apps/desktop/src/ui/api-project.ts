import { routes as projectsRoutes } from "@design-studio/actions/project/routes";
import type {
  Attachment,
  TrashedProject,
  Project,
  ProjectKind,
  ProjectSettings,
  RunLevel,
} from "@design-studio/contracts";

import type { ProjectSearchResult } from "../shared/project-search";
import {
  json,
  enc,
  toProjectPath,
  fileToBase64,
  base64ToBlob,
} from "./api-core.js";
import {
  PROJECT_PAGE_LIMIT,
  toAttachment,
  toProject,
  toSearchResult,
} from "./api-wire.js";
import type { ProjectWire } from "./api-wire.js";
import { call, request } from "./platform/http";

interface ProjectPage {
  readonly items: readonly ProjectWire[];
  readonly next: string | null;
}

const listProjectPages = async (
  cursor: string | null
): Promise<readonly ProjectWire[]> => {
  const page: ProjectPage = await call(projectsRoutes.listProject, {
    cursor,
    limit: PROJECT_PAGE_LIMIT,
  });

  if (page.next === null) {
    return page.items;
  }

  const rest = await listProjectPages(page.next);

  return [...page.items, ...rest];
};

const SEARCH_LIMIT = 20;

const projectApi = {
  createProject: async (input: {
    name?: string;
    prompt: string;
    kind: ProjectKind;
    settings?: Partial<ProjectSettings>;
    designMd?: string;
    packId?: string;
    level?: RunLevel;
    startRun?: boolean;
    parentPath?: string;
    referenceUrls?: string[];
  }): Promise<{ project: Project; runId: string | null }> => {
    const created = await call(projectsRoutes.createProject, input);

    return { project: toProject(created.project), runId: created.runId };
  },
  duplicateProject: (pid: string): Promise<{ project: Project }> =>
    json<{ project: Project }>("POST", `${toProjectPath(pid)}/duplicate`),
  getProject: async (pid: string): Promise<Project> =>
    toProject(await call(projectsRoutes.getProject, { projectId: pid })),
  hiddenProjects: (): Promise<{ count: number; target: string }> =>
    call(projectsRoutes.getHiddenProject, {}),
  importProject: async (
    path: string,
    options: { appDir?: string; skipApp?: boolean } = {}
  ): Promise<{ project: Project }> => {
    const imported = await call(projectsRoutes.importProject, {
      path,
      ...options,
    });

    return { project: toProject(imported.project) };
  },
  listProjects: async (): Promise<Project[]> => {
    const all = await listProjectPages(null);

    return all.map((item) => toProject(item));
  },
  markProjectOpened: (pid: string): Promise<{ openedAt: number }> =>
    json<{ openedAt: number }>("POST", `${toProjectPath(pid)}/opened`),
  moveHiddenProjects: (): Promise<{
    failed: { error: string; projectId: string }[];
    moved: string[];
  }> => call(projectsRoutes.moveHiddenProject, {}),
  projectFile: async (pid: string, filePath: string): Promise<Blob> => {
    const file = await call(projectsRoutes.getFileProject, {
      path: filePath,
      projectId: pid,
    });

    return base64ToBlob(file.data, file.mimeType);
  },
  renameProject: (pid: string, name: string): Promise<Project> =>
    json<Project>("PATCH", toProjectPath(pid), { name }),
  restoreProject: (trashId: string): Promise<{ project: Project }> =>
    json<{ project: Project }>("POST", `/api/trash/${enc(trashId)}/restore`),
  searchProjects: async (
    query: string,
    projectId: string | null,
    limit = SEARCH_LIMIT
  ): Promise<ProjectSearchResult> => {
    const found = await call(projectsRoutes.searchProject, {
      cursor: null,
      limit,
      projectId,
      query,
    });

    return toSearchResult(query, found.items);
  },
  thumbnail: async (pid: string, versionId: string): Promise<Blob> => {
    const res = await request(
      "GET",
      `${toProjectPath(pid)}/thumbnail/${enc(versionId)}`
    );

    return res.blob();
  },
  trashProject: (pid: string): Promise<TrashedProject> =>
    json<TrashedProject>("DELETE", toProjectPath(pid)),
  updateSettings: async (
    pid: string,
    settings: Partial<ProjectSettings>
  ): Promise<Project> =>
    toProject(
      await call(projectsRoutes.updateProject, {
        ...settings,
        projectId: pid,
      })
    ),
  uploadAttachment: async (pid: string, file: File): Promise<Attachment> =>
    toAttachment(
      await call(projectsRoutes.createAttachmentProject, {
        data: await fileToBase64(file),
        mime: file.type,
        name: file.name,
        projectId: pid,
      })
    ),
};

export { projectApi };
