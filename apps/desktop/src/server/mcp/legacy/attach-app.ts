import { createDevServer } from "@design-studio/actions/dev-server/create";
import { getDevServer } from "@design-studio/actions/dev-server/get";
import type { AppServerStatus, Project } from "@design-studio/contracts";

import { attachReadiness } from "../../app/first-version.js";
import type { AttachResponse } from "../../app/first-version.js";
import { callAction } from "../action-call.js";
import { approve, isTrustedFolder, oneLine } from "../edit-guards.js";
import type { EditDeps } from "../edit-guards.js";
import { ok } from "../edit-kit.js";
import type { Done } from "../edit-kit.js";
import { safeFolder } from "../folders.js";
import {
  sameFolderOrRoot,
  workspaceFields,
  workspaceOf,
} from "../workspace-tools.js";
import { attachedResult, serverViewOf } from "./projects-result.js";
import type { ServerView } from "./projects-result.js";
import type { AttachAppInput } from "./projects-schema.js";

type Workspace = Awaited<ReturnType<typeof workspaceOf>>;

interface AttachBody {
  appDir?: string;
  folder: string;
  name?: string;
  url?: string;
}

const NAME_TEXT_MAX = 60;
const FOLDER_TEXT_MAX = 160;

const FAILED_NEXT =
  "The dev server is not running. Fix the problem in server.message; the studio tries again on the next attach_app call or preview load.";

const READY_NEXT = "Call list_routes, then add_route_frame.";

const workspaceFor = (
  input: AttachAppInput,
  folder: string
): Promise<Workspace> => {
  if (input.appDir) {
    return Promise.resolve(null);
  }

  return workspaceOf(folder);
};

const scopeText = (workspace: Workspace): string => {
  if (workspace) {
    return `the ${workspace.name} monorepo at ${workspace.root} (this folder is its app ${workspace.appDir})`;
  }

  return "this folder";
};

const askToAttach = async (
  deps: EditDeps,
  folder: string,
  workspace: Workspace,
  who: string
): Promise<void> => {
  const projects = await deps.projects.list();

  const known = projects.some(
    (project) => project.app && sameFolderOrRoot(project, folder, workspace)
  );

  if (known || (await isTrustedFolder(deps, folder))) {
    return;
  }

  await approve(deps, {
    action: "Attach an app folder so edits write to its real files",
    client: who,
    detail: `The studio agent and write_file can then change the real files in ${scopeText(workspace)}.`,
    projectId: null,
    title: `${who} wants to attach ${oneLine(folder, FOLDER_TEXT_MAX)}`,
    tool: "attach_app",
  });
};

const attachBody = (input: AttachAppInput, folder: string): AttachBody => {
  const body: AttachBody = { folder };

  if (input.url) {
    body.url = input.url;
  }

  if (input.appDir) {
    body.appDir = input.appDir;
  }

  if (input.name) {
    body.name = input.name;
  }

  return body;
};

const serverView = async (
  deps: EditDeps,
  project: Project
): Promise<ServerView | null> => {
  try {
    const state = await callAction<{ status: AppServerStatus | null }>(
      deps,
      getDevServer,
      { projectId: project.id }
    );

    const { status } = state;

    if (!status) {
      return null;
    }

    return serverViewOf(status);
  } catch {
    return null;
  }
};

const nextText = (server: ServerView | null): string => {
  if (server?.state === "failed") {
    return FAILED_NEXT;
  }

  return READY_NEXT;
};

const attachApp = async (
  deps: EditDeps,
  input: AttachAppInput,
  client: string
): Promise<Done> => {
  const folder = await safeFolder(input.folder, deps.dataDir);

  const workspace = await workspaceFor(input, folder);

  await askToAttach(deps, folder, workspace, client);

  const { project, firstVersion, legacyCanvas } =
    await callAction<AttachResponse>(deps, createDevServer, {
      ...attachBody(input, folder),
    });

  const [main] = project.directions;

  const server = await serverView(deps, project);

  const next = nextText(server);

  const readiness = attachReadiness(firstVersion, legacyCanvas);

  const workspaceView = workspaceFields(project, folder);

  return {
    activity: {
      directionId: main?.id ?? null,
      projectId: project.id,
      summary: `Attached ${oneLine(project.name, NAME_TEXT_MAX)}`,
    },
    result: ok(
      attachedResult({
        main,
        next,
        project,
        readiness,
        server,
        workspace: workspaceView,
      })
    ),
  };
};

export { attachApp };
