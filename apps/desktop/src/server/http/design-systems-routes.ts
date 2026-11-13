import type { Direction, Project } from "@design-studio/contracts";
import type { Context, Hono } from "hono";

import type { AgentRunner, VersionStore } from "../../shared/server-ports.js";
import type { LiveDrafts } from "../design-system/draft-live.js";
import { createFetcher } from "../design-system/extract/draft.js";
import type { Fetcher } from "../design-system/extract/url.js";
import type { PackLibrary } from "../design-system/library.js";
import { bindPackRuntime } from "../design-system/ops/library-core.js";
import type { LoadedPack } from "../design-system/packs.js";
import { loadConfig } from "../platform/config/index.js";
import type { StudioProjectStore } from "../store/projects.js";

interface DesignSystemRouteDeps {
  allowLoopback: boolean;
  fetcher?: Fetcher;
  finishCreate: (project: Project, pack: LoadedPack) => Promise<Project>;
  library: PackLibrary;
  live?: LiveDrafts;
  projects: StudioProjectStore;
  projectsFolder: () => Promise<string>;
  trustedFolders?: () => Promise<readonly string[]>;
  readBody: (c: Context) => Promise<Record<string, unknown>>;
  runner: AgentRunner;
  versions: VersionStore;
  watch: (project: Project, direction: Direction) => void;
}

const toNoTrustedFolders = (): Promise<readonly string[]> =>
  Promise.resolve([]);

const registerDesignSystemRoutes = (
  _app: Hono,
  deps: DesignSystemRouteDeps
): void => {
  bindPackRuntime(loadConfig().dataDir, {
    drafts: {
      allowLoopback: deps.allowLoopback,
      fetcher: deps.fetcher ?? createFetcher(deps.allowLoopback),
      finishCreate: deps.finishCreate,
      projectsFolder: deps.projectsFolder,
      trustedFolders: deps.trustedFolders ?? toNoTrustedFolders,
      versions: deps.versions,
      watch: deps.watch,
    },
    library: deps.library,
    live: deps.live ?? null,
    projects: deps.projects,
    runner: deps.runner,
  });
};

export { registerDesignSystemRoutes };

export type { DesignSystemRouteDeps };
