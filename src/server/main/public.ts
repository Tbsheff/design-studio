import { mkdir } from "node:fs/promises";
import path from "node:path";

import { serve } from "@hono/node-server";

import type { StudioEvent } from "../../shared/contracts.js";
import { createAgentRunner } from "../agent/index.js";
import { createCanvasService } from "../canvas/service.js";
import { followSourceMoves } from "../direct-edit/follow-moves.js";
import { withSaveQueue } from "../direct-edit/save-queue.js";
import { openEventBus } from "../events/bus.js";
import type { EventBus, FlushableEventBus } from "../events/bus.js";
import { createApp } from "../http/app.js";
import { loadConfig } from "../platform/config/index.js";
import type { ServerConfig } from "../platform/config/index.js";
import { acquireDataLock } from "../platform/data-lock/index.js";
import { logError, logInfo } from "../platform/logger/index.js";
import { loadBridgeScript } from "../preview/bridge-bundle.js";
import { createPreviewService } from "../preview/index.js";
import { createCommentStore } from "../store/comments.js";
import { createProjectStore } from "../store/projects.js";
import { createVersionStore } from "../store/versions.js";
import { desktopSender, linkDesktop } from "./desktop-link.js";
import { watchParent } from "./parent-watch.js";

const FORCE_EXIT_MS = 5000;

type AppDeps = Parameters<typeof createApp>[0];

type Thumbnails = NonNullable<AppDeps["thumbnails"]>;

type Preview = ReturnType<typeof createPreviewService>;

type Versions = ReturnType<typeof createVersionStore>;

type Projects = ReturnType<typeof createProjectStore>;

type Project = Awaited<ReturnType<Projects["list"]>>[number];

type Listener = (event: StudioEvent) => void;

interface ObservedBus {
  bus: EventBus;
  observe: (listener: Listener) => void;
}

interface ThumbnailHooks {
  createThumbnailService: (
    deps: Pick<AppDeps, "preview" | "projects" | "versions">
  ) => Thumbnails;
  observeBus: (bus: EventBus) => ObservedBus;
  wantsThumbnail: (event: StudioEvent) => boolean;
}

interface ServerOptions {
  thumbnails?: ThumbnailHooks;
  uiDir?: string;
}

interface StudioServer {
  shutdown: (signal: string) => void;
}

interface BuiltApp {
  app: ReturnType<typeof createApp>;
  preview: Preview;
}

interface Stores {
  baseBus: FlushableEventBus;
  observed: ObservedBus;
  projects: Projects;
  versions: Versions;
}

const watchProject = async (
  preview: Preview,
  versions: Versions,
  project: Project
): Promise<void> => {
  await versions.ensureRepo(project);

  for (const direction of project.directions) {
    try {
      preview.watch(project, direction);
    } catch (error) {
      logError(`[studio] cannot watch ${project.id}/${direction.id}`, error);
    }
  }
};

const watchFrom = async (
  list: Project[],
  index: number,
  preview: Preview,
  versions: Versions
): Promise<void> => {
  const project = list[index];

  if (!project) {
    return;
  }

  await watchProject(preview, versions, project);
  await watchFrom(list, index + 1, preview, versions);
};

const watchExisting = async (
  preview: Preview,
  versions: Versions,
  projects: Projects
): Promise<void> => {
  const list = await projects.list();

  await watchFrom(list, 0, preview, versions);
};

const warmPreview = async (
  config: ServerConfig,
  preview: Preview,
  versions: Versions,
  projects: Projects
): Promise<void> => {
  try {
    await watchExisting(preview, versions, projects);
    await loadBridgeScript();
  } catch (error) {
    logError("[studio] preview warm-up failed", error, config.dataDir);
  }
};

const linkBus = (config: ServerConfig, baseBus: EventBus): EventBus => {
  const desktop = desktopSender();

  if (!desktop) {
    return baseBus;
  }

  return linkDesktop(baseBus, desktop, {
    dataDir: config.dataDir,
    token: config.studioToken,
  });
};

const openStores = async (
  config: ServerConfig,
  options: ServerOptions
): Promise<Stores> => {
  const versions = withSaveQueue(createVersionStore(config));
  const projects = createProjectStore(config, versions);
  const baseBus = await openEventBus(config.dataDir);
  const linked = linkBus(config, baseBus);

  const observed = options.thumbnails?.observeBus(linked) ?? {
    bus: linked,
    observe: (): null => null,
  };

  return { baseBus, observed, projects, versions };
};

const buildApp = (
  config: ServerConfig,
  options: ServerOptions,
  stores: Stores
): BuiltApp => {
  const { projects, versions } = stores;
  const { bus } = stores.observed;
  const { uiDir } = options;
  const preview = createPreviewService({ bus, config, projects, versions });

  const canvas = createCanvasService(bus, (projectId) =>
    projects.projectDir(projectId)
  );

  const comments = createCommentStore(config.dataDir, bus);

  followSourceMoves(comments);

  const runner = createAgentRunner({
    bus,
    canvas,
    comments,
    config,
    preview,
    projects,
    versions,
  });

  const hooks = options.thumbnails;

  const thumbnails = hooks?.createThumbnailService({
    preview,
    projects,
    versions,
  });

  stores.observed.observe((event) => {
    if (hooks?.wantsThumbnail(event)) {
      thumbnails?.schedule(event.projectId);
    }
  });

  const app = createApp({
    bus,
    canvas,
    comments,
    config,
    preview,
    projects,
    runner,
    thumbnails,
    uiDir,
    versions,
  });

  return { app, preview };
};

const stopAll = async (
  baseBus: FlushableEventBus,
  preview: Preview
): Promise<void> => {
  try {
    await Promise.all([baseBus.flush(), preview.stop()]);
  } catch (error) {
    logError("[studio] shutdown step failed", error);
  }

  process.exit(0);
};

const handleSignals = (
  server: ReturnType<typeof serve>,
  baseBus: FlushableEventBus,
  preview: Preview
): StudioServer => {
  let stopping = false;

  const shutdown = (signal: string): void => {
    if (stopping) {
      return;
    }

    stopping = true;
    logInfo(`[studio] ${signal} received, shutting down`);
    const forceExit = setTimeout(() => process.exit(1), FORCE_EXIT_MS);

    forceExit.unref();
    server.close();
    void stopAll(baseBus, preview);
  };

  watchParent(() => shutdown("parent exit"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGHUP", () => shutdown("SIGHUP"));

  return { shutdown };
};

const createServer = async (
  options: ServerOptions = {}
): Promise<StudioServer> => {
  const config = loadConfig();

  await mkdir(path.join(config.dataDir, "projects"), { recursive: true });
  const releaseLock = acquireDataLock(config.dataDir, config.studioPort);

  process.on("exit", releaseLock);

  const stores = await openStores(config, options);
  const { app, preview } = buildApp(config, options, stores);

  const server = serve(
    { fetch: app.fetch, hostname: "127.0.0.1", port: config.studioPort },
    () => {
      logInfo(
        `Design Studio running at ${config.studioOrigin} (agent: ${config.agentMode}, data: ${config.dataDir})`
      );
    }
  );

  await preview.start();
  void warmPreview(config, preview, stores.versions, stores.projects);

  return handleSignals(server, stores.baseBus, preview);
};

export { createServer };

export type { ServerOptions, StudioServer, ThumbnailHooks };
