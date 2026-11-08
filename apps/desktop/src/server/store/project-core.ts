import { existsSync } from "node:fs";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { SETTINGS_VERSION } from "@design-studio/contracts";
import type { Project } from "@design-studio/contracts";

import type { ServerConfig } from "../platform/config/index.js";
import {
  NotFoundError,
  assertSafeId,
  isNodeError,
} from "../platform/errors/index.js";
import { createKeyedMutex } from "../platform/mutex/index.js";
import {
  DEFAULT_TEMPLATE_DIR,
  installTemplateModules,
  migrateSettings,
  readJson,
  writeFileAtomic,
} from "./project-helpers.js";
import type {
  AppDetection,
  PackLookup,
  ProjectStoreOptions,
  ProjectStorePorts,
} from "./project-types.js";

interface ProjectCore {
  readonly apps: AppDetection;
  readonly attachmentsDir: (projectId: string) => string;
  readonly config: ServerConfig;
  readonly ensureTemplateModules: () => Promise<string>;
  readonly list: () => Promise<Project[]>;
  readonly lock: <T>(projectId: string, task: () => Promise<T>) => Promise<T>;
  readonly packs: PackLookup;
  readonly projectDir: (projectId: string) => string;
  readonly projectFile: (projectId: string) => string;
  readonly readProject: (projectId: string) => Promise<Project>;
  readonly templateDir: string;
  readonly writeProject: (project: Project) => Promise<void>;
}

const createProjectCore = (
  config: ServerConfig,
  ports: ProjectStorePorts,
  options: ProjectStoreOptions
): ProjectCore => {
  const { apps, packs } = ports;
  const lock = createKeyedMutex();
  const templateDir = options.templateDir ?? DEFAULT_TEMPLATE_DIR;
  const installDeps = options.installTemplateDeps ?? installTemplateModules;
  const projectsRoot = path.join(config.dataDir, "projects");
  const templateCacheDir = path.join(config.dataDir, "cache", "react-template");
  let templateInstall: Promise<string> | null = null;

  const projectDir = (projectId: string): string =>
    path.join(projectsRoot, assertSafeId(projectId, "projectId"));

  const projectFile = (projectId: string): string =>
    path.join(projectDir(projectId), "project.json");

  const attachmentsDir = (projectId: string): string =>
    path.join(projectDir(projectId), "attachments");

  const ensureTemplateModules = (): Promise<string> => {
    templateInstall ??= (async () => {
      const modules = path.join(templateCacheDir, "node_modules");
      const marker = path.join(templateCacheDir, ".studio-installed");

      const pkg = await readFile(
        path.join(templateDir, "package.json"),
        "utf-8"
      );

      const installedFor = existsSync(marker)
        ? await readFile(marker, "utf-8")
        : null;

      if (installedFor === pkg && existsSync(modules)) {
        return modules;
      }

      await mkdir(templateCacheDir, { recursive: true });
      await writeFile(path.join(templateCacheDir, "package.json"), pkg);
      await installDeps(templateCacheDir);
      await mkdir(modules, { recursive: true });
      await writeFile(marker, pkg);

      return modules;
    })().catch((error: unknown) => {
      templateInstall = null;
      throw error;
    });

    return templateInstall;
  };

  const readProject = async (projectId: string): Promise<Project> => {
    try {
      const project = (await readJson(projectFile(projectId))) as Project;
      project.settings = migrateSettings(project);

      return project;
    } catch (error) {
      if (isNodeError(error) && error.code === "ENOENT") {
        throw new NotFoundError(`project ${projectId} not found`);
      }

      throw error;
    }
  };

  const writeProject = async (project: Project): Promise<void> => {
    project.settingsVersion = SETTINGS_VERSION;
    await mkdir(projectDir(project.id), { recursive: true });
    await writeFileAtomic(
      projectFile(project.id),
      `${JSON.stringify(project, null, 2)}\n`
    );
  };

  const list = async (): Promise<Project[]> => {
    if (!existsSync(projectsRoot)) {
      return [];
    }

    const entries = await readdir(projectsRoot, { withFileTypes: true });
    const projects: Project[] = [];

    for (const entry of entries) {
      if (
        !entry.isDirectory() ||
        !existsSync(path.join(projectsRoot, entry.name, "project.json"))
      ) {
        continue;
      }

      try {
        projects.push(await readProject(entry.name));
      } catch (error) {
        console.error(`[projects] cannot read project ${entry.name}`, error);
      }
    }

    return projects.sort((a, b) => b.updatedAt - a.updatedAt);
  };

  return {
    apps,
    attachmentsDir,
    config,
    ensureTemplateModules,
    list,
    lock,
    packs,
    projectDir,
    projectFile,
    readProject,
    templateDir,
    writeProject,
  };
};

export { createProjectCore };

export type { ProjectCore };
