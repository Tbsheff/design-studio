import type { StudioEvent } from "@design-studio/contracts";
import { serve } from "@hono/node-server";
import { Effect } from "effect";

import { createCanvasService } from "../canvas/index.js";
import {
  createProjectLayerLocks,
  createWiredProjectStore,
} from "../design-system/project-ports.js";
import {
  followSourceMoves,
  withSaveQueue,
} from "../direct-edit/commit/index.js";
import { openEventBus } from "../events/index.js";
import type { EventBus, FlushableEventBus } from "../events/index.js";
import { createAppParts } from "../http/app.js";
import { eventRunner, toThumbnailNotice } from "../main/event-runner.js";
import { McpListenerRunner } from "../mcp-life/index.js";
import type { McpListenerRunnerApi } from "../mcp-life/index.js";
import { pageProbe } from "../page-probe/index.js";
import { loadConfig } from "../platform/config/index.js";
import type { ServerConfig } from "../platform/config/index.js";
import { logError, logInfo } from "../platform/logger/index.js";
import { createPreviewService, loadBridgeScript } from "../preview/index.js";
import { createCommentStore } from "../store/comments.js";
import { createVersionStore } from "../store/versions.js";
import { bootAgentRunner } from "./agent-runner.js";
import { desktopSender, linkDesktop } from "./desktop-link.js";
import { handleSignals, prepareDataDir, stopStaleRuns } from "./lifecycle.js";
import { buildRuntime } from "./runtime.js";
import type { StudioRuntime } from "./runtime.js";

type AppDeps = Parameters<typeof createAppParts>[0];

type Thumbnails = NonNullable<AppDeps["thumbnails"]>;

type Preview = ReturnType<typeof createPreviewService>;

type Versions = ReturnType<typeof createVersionStore>;

type Projects = ReturnType<typeof createWiredProjectStore>;

type Project = Awaited<ReturnType<Projects["list"]>>[number];

type Listener = (event: StudioEvent) => void;

interface ObservedBus {
  bus: EventBus;
  observe: (listener: Listener) => void;
}

interface ThumbnailHooks {
  createThumbnailService: (
    deps: Pick<AppDeps, "preview" | "projects" | "versions"> & {
      readonly onCaptured: (projectId: string) => void;
    }
  ) => Thumbnails;
  observeBus: (bus: EventBus) => ObservedBus;
  wantsThumbnail: (event: StudioEvent) => boolean;
}

interface ServerOptions {
  thumbnails?: ThumbnailHooks;
  uiDir?: string;
}

interface StudioServer {
  runtime: StudioRuntime;
  shutdown: (signal: string) => void;
}

interface LiveParts {
  readonly mcpListener: McpListenerRunnerApi;
  readonly runtime: StudioRuntime;
}

interface BuiltApp {
  app: ReturnType<typeof createAppParts>["app"];
  flushLayoutVersions: () => Promise<void>;
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
  const projects = createWiredProjectStore(config, versions);
  const baseBus = await openEventBus(config.dataDir, eventRunner);
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
  stores: Stores,
  live: LiveParts
): BuiltApp => {
  const { mcpListener, runtime } = live;
  const { projects, versions } = stores;
  const { bus } = stores.observed;
  const { uiDir } = options;
  const preview = createPreviewService({ bus, config, projects, versions });

  const canvas = createCanvasService(bus, (projectId) =>
    projects.projectDir(projectId)
  );

  const frameStates = {
    bus,
    canvas,
    projectDir: (projectId: string): string => projects.projectDir(projectId),
  };

  const comments = createCommentStore(config.dataDir, bus);

  const layerLocks = createProjectLayerLocks(projects, bus);

  followSourceMoves(comments, layerLocks);
  pageProbe.start();

  const runner = bootAgentRunner(
    {
      bus,
      canvas,
      comments,
      config,
      frameStates,
      layerLocks,
      preview,
      projects,
      versions,
    },
    runtime
  );

  const hooks = options.thumbnails;

  const thumbnails = hooks?.createThumbnailService({
    onCaptured: toThumbnailNotice(runtime),
    preview,
    projects,
    versions,
  });

  stores.observed.observe((event) => {
    if (hooks?.wantsThumbnail(event)) {
      thumbnails?.schedule(event.projectId);
    }
  });

  const { app, flushLayoutVersions } = createAppParts({
    bus,
    canvas,
    comments,
    config,
    frameStates,
    layerLocks,
    mcpListener,
    preview,
    projects,
    runner,
    runtime,
    thumbnails,
    uiDir,
    versions,
  });

  return { app, flushLayoutVersions, preview };
};

const createServer = async (
  options: ServerOptions = {}
): Promise<StudioServer> => {
  const config = await prepareDataDir(loadConfig());

  const runtime = buildRuntime(config);

  const [mcpListener, stores] = await Promise.all([
    runtime.runPromise(
      Effect.gen(function* getListener() {
        return yield* McpListenerRunner;
      })
    ),
    openStores(config, options),
    stopStaleRuns(config),
  ]);

  const { app, flushLayoutVersions, preview } = buildApp(
    config,
    options,
    stores,
    {
      mcpListener,
      runtime,
    }
  );

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

  return handleSignals(server, {
    baseBus: stores.baseBus,
    flushLayoutVersions,
    preview,
    runtime,
  });
};

export { createServer };

export type { ServerOptions, StudioServer, ThumbnailHooks };
