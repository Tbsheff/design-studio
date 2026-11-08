import { routes as projectsRoutes } from "@design-studio/actions/project/routes";
import { routes } from "@design-studio/actions/studio/routes";
import type {
  ClarifyQuestion,
  Starter,
  Project,
  SkillCatalog,
} from "@design-studio/contracts";
import type {
  WorkspaceFolder,
  WorkspaceList,
} from "@design-studio/contracts/folders";

import type { FolderInspection } from "../shared/open-app";
import { enc, json } from "./api-core.js";
import { call } from "./platform/http";

interface WorkspaceBody {
  label?: string;
  path: string;
}

interface StarterBody {
  parentPath?: string;
  starterId: string;
}

interface SampleBody {
  parentPath?: string;
}

interface InspectBody {
  appDir?: string;
  path: string;
}

const workspaceApi = {
  addWorkspace: (path: string, label?: string): Promise<WorkspaceFolder> => {
    const body: WorkspaceBody = { path };

    if (label) {
      body.label = label;
    }

    return json<WorkspaceFolder>("POST", "/api/workspaces", body);
  },
  clarify: (prompt: string): Promise<{ questions: ClarifyQuestion[] }> =>
    json<{ questions: ClarifyQuestion[] }>("POST", "/api/clarify", { prompt }),
  createFromStarter: (
    starterId: string,
    parentPath?: string
  ): Promise<{ project: Project }> => {
    const body: StarterBody = { starterId };

    if (parentPath) {
      body.parentPath = parentPath;
    }

    return json<{ project: Project }>(
      "POST",
      "/api/projects/from-starter",
      body
    );
  },
  createSample: (parentPath?: string): Promise<{ project: Project }> => {
    const body: SampleBody = {};

    if (parentPath) {
      body.parentPath = parentPath;
    }

    return json<{ project: Project }>("POST", "/api/projects/sample", body);
  },
  dismissOnboarding: (): Promise<{ dismissed: boolean }> =>
    json<{ dismissed: boolean }>("POST", "/api/onboarding/dismiss"),
  getDesignMd: (pid: string): Promise<{ content: string }> =>
    call(projectsRoutes.getDesignMdProject, { projectId: pid }),
  inspectFolder: (path: string, appDir?: string): Promise<FolderInspection> => {
    const body: InspectBody = { path };

    if (appDir) {
      body.appDir = appDir;
    }

    return json<FolderInspection>("POST", "/api/folders/inspect", body);
  },
  listSkills: (): Promise<SkillCatalog> => call(routes.listSkillsStudio, {}),
  listWorkspaces: (): Promise<WorkspaceList> =>
    json<WorkspaceList>("GET", "/api/workspaces"),
  onboarding: (): Promise<{ dismissed: boolean }> =>
    json<{ dismissed: boolean }>("GET", "/api/onboarding"),
  putDesignMd: (
    pid: string,
    content: string
  ): Promise<{ ok: boolean; versionId: string | null }> =>
    call(projectsRoutes.setDesignMdProject, { content, projectId: pid }),
  removeWorkspace: (id: string): Promise<{ ok: true }> =>
    json<{ ok: true }>("DELETE", `/api/workspaces/${enc(id)}`),
  renameWorkspace: (id: string, label: string): Promise<WorkspaceFolder> =>
    json<WorkspaceFolder>("PATCH", `/api/workspaces/${enc(id)}`, { label }),
  setDefaultFolder: (path: string): Promise<WorkspaceList> =>
    json<WorkspaceList>("PUT", "/api/workspaces/default", { path }),
  starters: (): Promise<Starter[]> => json<Starter[]>("GET", "/api/starters"),
};

export { workspaceApi };
