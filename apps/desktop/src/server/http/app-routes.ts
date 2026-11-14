import { spawn } from "node:child_process";
import { realpath, stat } from "node:fs/promises";
import path from "node:path";

import type {
  Direction,
  LegacyCanvasNotice,
  Project,
} from "@design-studio/contracts";
import type { Context, Hono } from "hono";

import type {
  PreviewService,
  VersionStore,
} from "../../shared/server-ports.js";
import { bindDevServerRuntime } from "../app/dev-server-runtime.js";
import type { AttachResponse } from "../app/first-version.js";
import { setAsideLegacyCanvas } from "../canvas/index.js";
import { warmKit } from "../components/props-service.js";
import { BadRequestError, ConflictError } from "../platform/errors/index.js";
import { userGit } from "../platform/git/index.js";
import {
  isFirstVersionDone,
  isFirstVersionRunning,
  startFirstVersion,
  toFirstVersionState,
  toFirstVersionWaitText,
} from "../store/index.js";
import type { StudioProjectStore } from "../store/projects.js";

const SOURCE_PATTERN = /^(.+):(\d+):(\d+)$/;
const EDITOR_TIMEOUT_MS = 5000;
const EDIT_WAIT_MS = 20_000;

const EDIT_ROUTES =
  /\/d\/[^/]+\/(direct-edit|discard|keep|undo|restore|insert|props|props\/variant-classes|review\/fix|tweaks\/commit|(edit-history|edit-session)\/\w+|design-system\/(apply|save|tokens|tokens\/update)|(fill|motion|spacing|stacking|accessibility|state-styles|state-styles\/forced|component-variant\/(create|update)|import-page|update-text|image-search\/place|icons\/insert|text-styles\/\w+))$/;

export interface AppRouteDeps {
  projects: StudioProjectStore;
  versions: VersionStore;
  preview: PreviewService;
  readBody: (c: Context) => Promise<Record<string, unknown>>;
  commitInit: (project: Project) => Promise<Project>;
  watch: (project: Project, direction: Direction) => void;
}

function editorCommand(): string {
  return process.env.STUDIO_EDITOR?.trim() || "code";
}

function openInEditor(file: string, line: number, col: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(editorCommand(), ["-g", `${file}:${line}:${col}`], {
      stdio: "ignore",
      detached: true,
    });

    const timer = setTimeout(() => {
      child.unref();
      resolve();
    }, EDITOR_TIMEOUT_MS);

    child.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.once("exit", (code) => {
      clearTimeout(timer);

      if (code === 0 || code === null) {
        resolve();
      } else {
        reject(new Error(`${editorCommand()} exited with code ${code}`));
      }
    });
  });
}

export async function resolveSourceFile(
  workTree: string,
  source: string
): Promise<{ relative: string; absolute: string; line: number; col: number }> {
  const match = SOURCE_PATTERN.exec(source);

  if (!match?.[1]) {
    throw new BadRequestError("source must be file:line:col");
  }

  const root = await realpath(workTree);

  const absolute = await realpath(path.resolve(root, match[1])).catch(
    () => null
  );

  const relative = absolute ? path.relative(root, absolute) : "..";

  if (
    !absolute ||
    relative.startsWith("..") ||
    path.isAbsolute(relative) ||
    relative
      .split(path.sep)
      .some((part) => part === ".git" || part === "node_modules")
  ) {
    throw new BadRequestError("source is not a file in this project");
  }

  if (!(await stat(absolute)).isFile()) {
    throw new BadRequestError("source is not a file");
  }

  return {
    relative: relative.split(path.sep).join("/"),
    absolute,
    line: Number(match[2]),
    col: Number(match[3]),
  };
}

function needsFirstVersion(project: Project): boolean {
  return Boolean(project.app) && project.directions[0]?.headVersionId === null;
}

function ensureFirstVersion(deps: FirstVersionDeps, project: Project): void {
  if (!needsFirstVersion(project) || isFirstVersionRunning(project.id)) {
    return;
  }

  startFirstVersion(
    project.id,
    deps.versions.untrackedCount?.(project) ?? null,
    () => deps.commitInit(project)
  );
}

async function trackedByUserRepo(
  workTree: string,
  relative: string
): Promise<boolean> {
  const result = await userGit(
    workTree,
    ["ls-files", "--error-unmatch", "--", relative],
    { allowFail: true }
  ).catch(() => null);

  return result?.code === 0;
}

async function setAsideCanvas(
  deps: AppRouteDeps,
  project: Project
): Promise<LegacyCanvasNotice | null> {
  try {
    return await setAsideLegacyCanvas(
      project,
      (id) => deps.projects.projectDir(id),
      trackedByUserRepo
    );
  } catch (error) {
    console.error(
      `[app] could not set aside the old canvas of ${project.id}`,
      error
    );

    return null;
  }
}

export async function finishAttach(
  deps: AppRouteDeps,
  attached: Project
): Promise<AttachResponse> {
  const fresh = needsFirstVersion(attached);
  deps.preview.apps?.forget(attached.id);
  deps.watch(attached, deps.projects.mainDirection(attached));
  warmKit(attached, deps.projects.mainDirection(attached));
  if (attached.app?.mode === "url") {
    await deps.preview.apps?.ensure(attached).catch(() => undefined);
  }

  if (!fresh) {
    return { project: attached, firstVersion: null, legacyCanvas: null };
  }

  const legacyCanvas = await setAsideCanvas(deps, attached);
  await deps.versions.ensureRepo(attached);

  return {
    project: attached,
    firstVersion: toFirstVersionState(attached.id),
    legacyCanvas,
  };
}

type FirstVersionDeps = Pick<
  AppRouteDeps,
  "commitInit" | "projects" | "versions"
>;

export async function holdEditsForFirstVersion(
  deps: FirstVersionDeps,
  pid: string
): Promise<void> {
  const project = await deps.projects.get(pid).catch(() => null);

  if (!project || !needsFirstVersion(project)) {
    return;
  }

  ensureFirstVersion(deps, project);

  if (await isFirstVersionDone(pid, EDIT_WAIT_MS)) {
    const saved = await deps.projects.get(pid);

    if (!needsFirstVersion(saved)) {
      return;
    }
  }

  throw new ConflictError(toFirstVersionWaitText(pid));
}

export const applyFirstVersionHold = (app: Hono, deps: AppRouteDeps): void => {
  app.use("/api/projects/:pid/d/:did/*", async (c, next) => {
    if (c.req.method !== "GET" && EDIT_ROUTES.test(c.req.path)) {
      await holdEditsForFirstVersion(deps, c.req.param("pid"));
    }

    await next();
  });
};

export function registerAppRoutes(app: Hono, deps: AppRouteDeps): void {
  const { projects } = deps;

  bindDevServerRuntime({
    projects,
    preview: deps.preview,
    attach: (project) => finishAttach(deps, project),
  });

  app.post("/api/projects/:pid/d/:did/open-source", async (c) => {
    const project = await projects.get(c.req.param("pid"));
    const direction = projects.directionOf(project, c.req.param("did"));
    const body = await deps.readBody(c);

    if (typeof body.source !== "string" || body.source.length > 2000) {
      throw new BadRequestError("source is required");
    }

    const file = await resolveSourceFile(direction.workTree, body.source);

    try {
      await openInEditor(file.absolute, file.line, file.col);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);

      return c.json(
        {
          error: "no_editor",
          message: `Could not open an editor (${reason}). Set STUDIO_EDITOR to your editor command, for example code or cursor.`,
          path: file.relative,
        },
        422
      );
    }

    return c.json({
      opened: true,
      path: file.relative,
      line: file.line,
      col: file.col,
    });
  });
}
