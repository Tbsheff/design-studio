import { existsSync } from "node:fs";
import { rm, mkdir } from "node:fs/promises";
import path from "node:path";

import type {
  Direction,
  Project,
  ProjectSettings,
} from "@design-studio/contracts";
import { slugify } from "@design-studio/contracts/folders";

import type { VersionStore } from "../../shared/server-ports.js";
import type { ServerConfig } from "../platform/config/index.js";
import { BadRequestError, NotFoundError } from "../platform/errors/index.js";
import { createProjectCore } from "./project-core.js";
import { createProjectCreation } from "./project-create.js";
import { createProjectFiles } from "./project-files.js";
import {
  cleanAppUrl,
  directionId,
  directionOf,
  isInsideDataDir,
  linkNodeModules,
  mainDirection,
  makeNewSubfolder,
  newDirection,
  resolveUserFolder,
} from "./project-helpers.js";
import { bindProjectRuntime } from "./project-runtime.js";
import type {
  AppDetection,
  DetectedApp,
  ImportOptions,
  PackLookup,
  ProjectStoreOptions,
  ProjectStorePorts,
  StudioProjectStore,
} from "./project-types.js";

const createProjectStore = (
  config: ServerConfig,
  versions: VersionStore,
  ports: ProjectStorePorts,
  options: ProjectStoreOptions = {}
): StudioProjectStore => {
  const core = createProjectCore(config, ports, options);
  const { lock, projectDir, readProject, writeProject } = core;

  const store: StudioProjectStore = {
    projectDir,
    directionOf,
    mainDirection,
    list: core.list,
    get: readProject,
    ...createProjectCreation(core),
    ...createProjectFiles(core),

    isHidden(project: Project): boolean {
      return (
        project.imported === null &&
        isInsideDataDir(
          config.dataDir,
          path.resolve(mainDirection(project).workTree)
        )
      );
    },

    save(project: Project): Promise<void> {
      return lock(project.id, async () => {
        project.updatedAt = Date.now();
        await writeProject(project);
      });
    },

    async addDirection(
      projectId: string,
      input: { name: string; fromVersionId: string | null }
    ): Promise<Direction> {
      const project = await readProject(projectId);

      if (project.app) {
        throw new BadRequestError(
          "An attached app has one direction: the app folder itself. Directions and variations copy the folder, so they are off for attached apps."
        );
      }

      const id = directionId();
      const workTree = path.join(projectDir(projectId), "directions", id);

      const direction = newDirection(
        id,
        input.name.trim() || `Direction ${project.directions.length + 1}`,
        workTree,
        Date.now()
      );

      let source = mainDirection(project);
      const fromVersionId = input.fromVersionId ?? source.headVersionId;

      try {
        await mkdir(workTree, { recursive: true });

        if (fromVersionId) {
          const version = await versions.get(project, fromVersionId);
          source =
            project.directions.find(
              (candidate) => candidate.id === version.directionId
            ) ?? source;
          await versions.checkoutInto(project, version.id, workTree);
          direction.parentVersionId = version.id;
        }

        if (project.kind === "react") {
          const sourceModules = path.join(source.workTree, "node_modules");

          if (existsSync(sourceModules)) {
            await linkNodeModules(workTree, sourceModules);
          }
        }
      } catch (error) {
        await rm(workTree, { force: true, recursive: true });
        throw error;
      }

      return lock(projectId, async () => {
        const latest = await readProject(projectId);
        latest.directions.push(direction);
        latest.updatedAt = Date.now();
        await writeProject(latest);

        return direction;
      });
    },

    updateDirection(
      projectId: string,
      id: string,
      patch: Partial<Direction>
    ): Promise<Direction> {
      return lock(projectId, async () => {
        const project = await readProject(projectId);

        const index = project.directions.findIndex(
          (candidate) => candidate.id === id
        );

        const current = project.directions[index];

        if (index === -1 || current === undefined) {
          throw new NotFoundError(`direction ${id} not found`);
        }

        const updated: Direction = {
          ...current,
          ...patch,
          branch: current.branch,
          id: current.id,
          workTree: current.workTree,
        };

        project.directions[index] = updated;
        project.updatedAt = Date.now();
        await writeProject(project);

        return updated;
      });
    },

    updateSettings(
      projectId: string,
      patch: Partial<ProjectSettings>
    ): Promise<Project> {
      return lock(projectId, async () => {
        const project = await readProject(projectId);
        project.settings = { ...project.settings, ...patch };
        project.updatedAt = Date.now();
        await writeProject(project);

        return project;
      });
    },

    rename(projectId: string, name: string): Promise<Project> {
      const trimmed = typeof name === "string" ? name.trim() : "";

      if (trimmed === "") {
        throw new BadRequestError("name is required");
      }

      if (trimmed.length > 120) {
        throw new BadRequestError("name must be 120 characters or less");
      }

      return lock(projectId, async () => {
        const project = await readProject(projectId);
        project.name = trimmed;
        project.updatedAt = Date.now();
        await writeProject(project);

        return project;
      });
    },

    withLock: (projectId, task) => lock(projectId, task),

    linkModules: linkNodeModules,

    async reserveFolder(parentPath: string, name: string): Promise<string> {
      return makeNewSubfolder(
        await resolveUserFolder(config.dataDir, parentPath),
        slugify(name)
      );
    },

    writeRaw: (project) => writeProject(project),

    markDesignSystemDeleted(projectId: string): Promise<Project> {
      return lock(projectId, async () => {
        const project = await readProject(projectId);
        project.designSystemDeleted = true;
        project.updatedAt = Date.now();
        await writeProject(project);

        return project;
      });
    },

    setPackId(projectId: string, packId: string | null): Promise<Project> {
      return lock(projectId, async () => {
        const project = await readProject(projectId);
        project.packId = packId;
        project.updatedAt = Date.now();
        await writeProject(project);

        return project;
      });
    },
  };

  bindProjectRuntime(config.dataDir, store);

  return store;
};

export { createProjectStore, cleanAppUrl };

export type {
  AppDetection,
  DetectedApp,
  ImportOptions,
  PackLookup,
  ProjectStorePorts,
  StudioProjectStore,
};
