import { existsSync } from "node:fs";
import { cp, mkdir, rm } from "node:fs/promises";
import path from "node:path";

import { DEFAULT_SETTINGS } from "@design-studio/contracts";
import type {
  AttachAppRequest,
  AttachedApp,
  Direction,
  Project,
  ProjectKind,
  ProjectSettings,
} from "@design-studio/contracts";
import { slugify } from "@design-studio/contracts/folders";
import { nanoid } from "nanoid";

import { BadRequestError } from "../platform/errors/index.js";
import type { ProjectCore } from "./project-core.js";
import {
  MAIN_DIRECTION_ID,
  cleanAppEnv,
  cleanAppUrl,
  hasViteDependency,
  isInsideDataDir,
  linkNodeModules,
  makeNewSubfolder,
  mainDirection,
  newDirection,
  newProject,
  pickAppDir,
  readJson,
  resolveUserFolder as resolveFolderIn,
  workspaceAppDir,
} from "./project-helpers.js";
import type { ImportOptions } from "./project-types.js";

const createProjectCreation = (core: ProjectCore) => {
  const {
    apps,
    attachmentsDir,
    ensureTemplateModules,
    lock,
    packs,
    projectDir,
    readProject,
    templateDir,
    writeProject,
  } = core;

  const { dataDir } = core.config;

  const resolveUserFolder = (sourcePath: string): Promise<string> =>
    resolveFolderIn(dataDir, sourcePath);

  const registerFolder = async (
    folder: string,
    input: {
      name: string;
      kind: ProjectKind;
      created: boolean;
      settings?: Partial<ProjectSettings>;
      designSystemFor?: string;
    }
  ): Promise<Project> => {
    const id = nanoid(10);
    const now = Date.now();

    const project = newProject(
      id,
      input.name,
      input.kind,
      newDirection(MAIN_DIRECTION_ID, "Main", folder, now),
      now
    );

    project.imported = input.created
      ? { created: true, sourcePath: folder }
      : { sourcePath: folder };
    project.settings = { ...project.settings, ...input.settings };

    if (input.designSystemFor) {
      project.designSystemFor = input.designSystemFor;
    }

    await mkdir(attachmentsDir(id), { recursive: true });
    await writeProject(project);

    return project;
  };

  const updateApp = (
    projectId: string,
    app: AttachedApp,
    keepEnv: boolean
  ): Promise<Project> =>
    lock(projectId, async () => {
      const project = await readProject(projectId);
      project.app =
        keepEnv && project.app?.env ? { ...app, env: project.app.env } : app;
      project.updatedAt = Date.now();
      await writeProject(project);

      return project;
    });

  const api = {
    async attachApp(input: AttachAppRequest): Promise<Project> {
      if (typeof input.folder !== "string" || input.folder.trim() === "") {
        throw new BadRequestError(
          "folder is required: the app code must be on this computer so routes and click-to-source can read it"
        );
      }

      const opened = await resolveUserFolder(input.folder);
      const workspace = await workspaceAppDir(apps, opened, input.appDir);

      const folder = workspace
        ? await resolveUserFolder(workspace.root).catch(() => opened)
        : opened;

      const url =
        typeof input.url === "string" && input.url.trim() !== ""
          ? cleanAppUrl(input.url)
          : undefined;

      const env = cleanAppEnv(input.env);

      const appDir = await pickAppDir(
        apps,
        folder,
        folder === opened ? input.appDir : workspace?.appDir
      );

      const app: AttachedApp = {
        framework: "next",
        appDir,
        mode: url ? "url" : "managed",
        ...(url ? { url } : {}),
        ...(env ? { env } : {}),
      };

      const existing = (await core.list()).find(
        (project) =>
          project.app &&
          project.imported?.sourcePath === folder &&
          project.app.appDir === appDir
      );

      if (existing) {
        return updateApp(existing.id, app, input.env === undefined);
      }

      const fallbackName =
        appDir === "."
          ? path.basename(folder)
          : `${path.basename(folder)} ${path.basename(appDir)}`;

      const name = (
        typeof input.name === "string" && input.name.trim() !== ""
          ? input.name.trim()
          : fallbackName
      ).slice(0, 120);

      const project = await registerFolder(folder, {
        name,
        kind: "react",
        created: false,
      });

      project.app = app;
      project.entry = "/";
      await writeProject(project);

      return project;
    },

    async create(input: {
      name: string;
      kind: ProjectKind;
      settings?: Partial<ProjectSettings>;
    }): Promise<Project> {
      if (input.kind !== "html" && input.kind !== "react") {
        throw new BadRequestError("kind must be html or react");
      }

      const id = nanoid(10);
      const now = Date.now();

      const workTree = path.join(
        projectDir(id),
        "directions",
        MAIN_DIRECTION_ID
      );

      const project = newProject(
        id,
        input.name.trim() || "Untitled",
        input.kind,
        newDirection(MAIN_DIRECTION_ID, "Main", workTree, now),
        now
      );

      project.settings = { ...project.settings, ...input.settings };

      try {
        await mkdir(workTree, { recursive: true });
        await mkdir(attachmentsDir(id), { recursive: true });

        if (input.kind === "react") {
          await cp(templateDir, workTree, { recursive: true });
          await linkNodeModules(workTree, await ensureTemplateModules());
        }

        await writeProject(project);
      } catch (error) {
        await rm(projectDir(id), { recursive: true, force: true });
        throw error;
      }

      return project;
    },

    async createInFolder(input: {
      parentPath: string;
      name: string;
      kind: ProjectKind;
      settings?: Partial<ProjectSettings>;
      designSystemFor?: string;
      folderName?: string;
    }): Promise<Project> {
      if (input.kind !== "html" && input.kind !== "react") {
        throw new BadRequestError("kind must be html or react");
      }

      if (
        typeof input.parentPath !== "string" ||
        !path.isAbsolute(input.parentPath)
      ) {
        throw new BadRequestError("parentPath must be an absolute path");
      }

      const parent = await resolveUserFolder(input.parentPath);
      const name = input.name.trim() || "Untitled";
      const slug = input.folderName ?? slugify(name);
      const folder = await makeNewSubfolder(parent, slug);
      let project: Project | null = null;

      try {
        if (input.kind === "react") {
          await cp(templateDir, folder, { recursive: true });
          await linkNodeModules(folder, await ensureTemplateModules());
        }

        project = await registerFolder(folder, {
          name,
          kind: input.kind,
          created: true,
          settings: input.settings,
          designSystemFor: input.designSystemFor,
        });

        return project;
      } catch (error) {
        await rm(folder, { recursive: true, force: true });

        if (project) {
          await rm(projectDir(project.id), { recursive: true, force: true });
        }

        throw error;
      }
    },

    async discardCreated(projectId: string): Promise<void> {
      await lock(projectId, async () => {
        const project = await readProject(projectId);

        const folder = project.imported?.created
          ? project.imported.sourcePath
          : null;

        if (folder) {
          await rm(folder, { recursive: true, force: true });
        }

        await rm(projectDir(projectId), { recursive: true, force: true });
      });
    },

    async importFolder(
      sourcePath: string,
      options: ImportOptions = {}
    ): Promise<Project> {
      const folder = await resolveUserFolder(sourcePath);

      if (options.appDir) {
        return api.attachApp({ folder, appDir: options.appDir });
      }

      if (
        !options.skipApp &&
        (await apps.detectApp(folder)).framework === "next"
      ) {
        return api.attachApp({ folder });
      }

      const packageFile = path.join(folder, "package.json");
      const hasPackage = existsSync(packageFile);

      const isVite =
        hasPackage &&
        hasViteDependency(await readJson(packageFile).catch(() => null));

      const appWithTokens =
        hasPackage && !isVite && (await packs.findTokenFile(folder)) !== null;

      if (
        !isVite &&
        !appWithTokens &&
        !existsSync(path.join(folder, "index.html"))
      ) {
        throw new BadRequestError(
          "folder needs a package.json with a vite dependency or an index.html"
        );
      }

      return registerFolder(folder, {
        name: path.basename(folder),
        kind: isVite ? "react" : "html",
        created: false,
      });
    },

    async moveIntoFolder(
      projectId: string,
      parentPath: string
    ): Promise<Project> {
      if (typeof parentPath !== "string" || !path.isAbsolute(parentPath)) {
        throw new BadRequestError("parentPath must be an absolute path");
      }

      const parent = await resolveUserFolder(parentPath);

      return lock(projectId, async () => {
        const project = await readProject(projectId);
        const main = mainDirection(project);
        const from = main.workTree;

        if (
          project.imported !== null ||
          !isInsideDataDir(dataDir, path.resolve(from))
        ) {
          throw new BadRequestError(
            `project ${projectId} is not in the hidden folder`
          );
        }

        const folder = await makeNewSubfolder(parent, slugify(project.name));

        try {
          await cp(from, folder, {
            recursive: true,
            verbatimSymlinks: true,
            force: false,
            preserveTimestamps: true,
          });

          const moved: Direction = {
            ...main,
            workTree: folder,
            sessionId: null,
            sessionCostUsd: 0,
            sessionResetReason: "move",
          };

          project.directions = project.directions.map((direction) =>
            direction.id === main.id ? moved : direction
          );
          project.imported = { sourcePath: folder, created: true };
          await writeProject(project);
        } catch (error) {
          await rm(folder, { recursive: true, force: true });
          throw error;
        }

        await rm(from, { recursive: true, force: true }).catch(
          (error: unknown) =>
            console.error(
              `[projects] moved ${projectId} but could not remove ${from}`,
              error
            )
        );

        return project;
      });
    },
  };

  return api;
};

export { createProjectCreation };
