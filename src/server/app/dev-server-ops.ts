import type { AttachAppRequest, Project } from "../../shared/contracts.js";
import { BadRequestError, NotFoundError } from "../store/errors.js";
import type { DevServerRuntime } from "./dev-server-runtime.js";
import { firstVersionState } from "./first-version.js";
import { listAppRoutes } from "./routes.js";

type Field = string | null | undefined;

type EnvField = Record<string, string> | null | undefined;

interface AttachInput {
  readonly appDir?: Field;
  readonly env?: EnvField;
  readonly folder?: Field;
  readonly name?: Field;
  readonly url?: Field;
}

interface ConfigInput {
  readonly env?: EnvField;
  readonly projectId: string;
  readonly url?: Field;
}

type Control = "restart" | "start" | "stop";

const orUndefined = (value: Field): string | undefined => value ?? undefined;

const readAppProject = async (
  runtime: DevServerRuntime,
  projectId: string
): Promise<Project> => {
  const project = await runtime.projects.get(projectId);

  if (!project.app) {
    throw new NotFoundError(`project ${projectId} is not an attached app`);
  }

  return project;
};

const readView = async (runtime: DevServerRuntime, projectId: string) => {
  const project = await readAppProject(runtime, projectId);
  const { apps } = runtime.preview;
  runtime.ensureFirstVersion(project);

  return {
    app: project.app,
    firstVersion: firstVersionState(project.id),
    logs: apps?.logs(project.id) ?? [],
    status: apps?.status(project) ?? null,
  };
};

const applyConfig = async (runtime: DevServerRuntime, input: ConfigInput) => {
  const project = await readAppProject(runtime, input.projectId);
  const current = project.app;
  const folder = project.imported?.sourcePath;

  if (!current || !folder) {
    throw new BadRequestError("project is not an attached app");
  }

  const url = input.url === undefined ? current.url : input.url;
  const env = input.env === undefined ? current.env : input.env;

  const updated = await runtime.projects.attachApp({
    folder,
    appDir: current.appDir,
    ...(typeof url === "string" && url.trim() !== "" ? { url } : {}),
    env: env ?? {},
  });

  runtime.preview.apps?.forget(updated.id);
  void runtime.preview.apps?.restart(updated).catch(() => undefined);

  return { app: updated.app };
};

const controlServer = async (
  runtime: DevServerRuntime,
  projectId: string,
  control: Control
) => {
  const project = await readAppProject(runtime, projectId);
  const apps = runtime.preview.apps;

  if (!apps) {
    throw new BadRequestError("app servers are not available");
  }

  if (control === "stop") {
    await apps.stop(project.id);
  } else if (control === "start") {
    void apps.ensure(project).catch(() => undefined);
  } else {
    void apps.restart(project).catch(() => undefined);
  }

  return apps.status(project);
};

const readRoutes = async (runtime: DevServerRuntime, projectId: string) => {
  const project = await readAppProject(runtime, projectId);

  return {
    routes: await listAppRoutes(
      runtime.projects.mainDirection(project).workTree,
      project.app?.appDir ?? "."
    ),
  };
};

const attachApp = async (runtime: DevServerRuntime, input: AttachInput) => {
  const request: AttachAppRequest = {
    folder: orUndefined(input.folder),
    url: orUndefined(input.url),
    appDir: orUndefined(input.appDir),
    name: orUndefined(input.name),
    ...(input.env ? { env: input.env } : {}),
  };

  return runtime.attach(await runtime.projects.attachApp(request));
};

export { applyConfig, attachApp, controlServer, readRoutes, readView };

export type { AttachInput, Control };
