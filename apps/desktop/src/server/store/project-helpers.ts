import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import {
  cp,
  mkdir,
  readFile,
  realpath,
  rm,
  stat,
  symlink,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { customAlphabet } from "nanoid";

import {
  DEFAULT_SETTINGS,
  LEGACY_DEFAULT_BUDGET_USD,
  SETTINGS_VERSION,
} from "@design-studio/actions/_core/contracts";
import type {
  AppFramework,
  Direction,
  Project,
  ProjectKind,
  ProjectSettings,
} from "@design-studio/actions/_core/contracts";
import { MAX_SLUG_SUFFIX, slugCandidate } from "@design-studio/actions/_core/folders";
import { writeAtomic } from "../platform/atomic-write/index.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  PickAppError,
  isNodeError,
} from "../platform/errors/index.js";
import { packagedResource, resourcePath } from "../platform/resources/index.js";
import type { AppDetection } from "./project-types.js";

export const MAIN_DIRECTION_ID = "main";
export const DESIGN_MD_FILE = "DESIGN.md";

export const writeFileAtomic = (file: string, content: string): Promise<void> =>
  writeAtomic(file, content, { createDir: true });

export const DEFAULT_TEMPLATE_DIR = resourcePath(
  path.join("templates", "react-vite"),
  path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "..",
    "templates",
    "react-vite"
  )
);

export const PREBUILT_TEMPLATE_DIR = "react-template";

export const directionId = customAlphabet(
  "0123456789abcdefghijklmnopqrstuvwxyz",
  8
);

export const MIME_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/avif": "avif",
  "application/pdf": "pdf",
  "text/plain": "txt",
};

export const ATTACHMENT_IMAGE_TYPES: Record<string, string[]> = {
  "image/png": ["png"],
  "image/jpeg": ["jpg", "jpeg"],
  "image/gif": ["gif"],
  "image/webp": ["webp"],
};

export const ENV_KEY = /^[A-Z_][A-Z0-9_]{0,63}$/;

export const BLOCKED_ENV_KEY =
  /^(STUDIO_|ANTHROPIC_|CLAUDE_|NODE_OPTIONS$|PATH$|HOME$)/;

export const MAX_ENV_KEYS = 64;
export const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

export function cleanAppUrl(raw: string): string {
  let url: URL;

  try {
    url = new URL(raw.trim());
  } catch {
    throw new BadRequestError(
      "url must be a full http URL, for example http://localhost:3000"
    );
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new BadRequestError("url must use http or https");
  }

  if (!LOOPBACK_HOSTS.has(url.hostname)) {
    throw new BadRequestError(
      "url must point at a dev server on this computer (localhost or 127.0.0.1)"
    );
  }

  if (url.username || url.password) {
    throw new BadRequestError("url must not hold a user name or password");
  }

  return url.origin;
}

export function cleanAppEnv(raw: unknown): Record<string, string> | undefined {
  if (raw === undefined || raw === null) {
    return undefined;
  }

  if (typeof raw !== "object" || Array.isArray(raw)) {
    throw new BadRequestError("env must be an object of strings");
  }

  const entries = Object.entries(raw as Record<string, unknown>);

  if (entries.length > MAX_ENV_KEYS) {
    throw new BadRequestError(`env takes at most ${MAX_ENV_KEYS} keys`);
  }

  const env: Record<string, string> = {};

  for (const [key, value] of entries) {
    if (!ENV_KEY.test(key) || BLOCKED_ENV_KEY.test(key)) {
      throw new BadRequestError(`env key ${key} is not allowed`);
    }

    if (
      typeof value !== "string" ||
      value.length > 4000 ||
      value.includes("\0")
    ) {
      throw new BadRequestError(`env ${key} must be a short string`);
    }

    env[key] = value;
  }

  return env;
}

export function migrateSettings(
  project: Pick<Project, "settings" | "settingsVersion">
): ProjectSettings {
  const settings = { ...DEFAULT_SETTINGS, ...project.settings };

  if (
    (project.settingsVersion ?? 1) < SETTINGS_VERSION &&
    settings.maxBudgetUsd === LEGACY_DEFAULT_BUDGET_USD
  ) {
    settings.maxBudgetUsd = null;
  }

  return settings;
}

export function attachmentProblem(name: string, mime: string): string | null {
  const allowed = ATTACHMENT_IMAGE_TYPES[mime.toLowerCase()];
  const extension = path.extname(name).slice(1).toLowerCase();
  const message = `Attachments must be PNG, JPEG, GIF or WebP images. "${name || "file"}" (${mime || "unknown type"}) is not allowed.`;

  if (!allowed) {
    return message;
  }

  if (
    extension !== "" &&
    !Object.values(ATTACHMENT_IMAGE_TYPES).flat().includes(extension)
  ) {
    return message;
  }

  return null;
}

export function runNpmInstall(cwd: string): Promise<void> {
  return new Promise((resolve, reject) => {
    execFile(
      process.platform === "win32" ? "npm.cmd" : "npm",
      ["install", "--no-audit", "--no-fund"],
      { cwd, maxBuffer: 64 * 1024 * 1024 },
      (error, _stdout, stderr) => {
        if (error) {
          reject(
            new Error(
              `npm install failed in ${cwd}: ${stderr.trim() || error.message}`
            )
          );
        } else {
          resolve();
        }
      }
    );
  });
}

export async function copyPrebuiltModules(
  prebuilt: string,
  cacheDir: string
): Promise<void> {
  await rm(path.join(cacheDir, "node_modules"), {
    recursive: true,
    force: true,
  });
  await cp(
    path.join(prebuilt, "node_modules"),
    path.join(cacheDir, "node_modules"),
    { recursive: true, verbatimSymlinks: true }
  );
}

export async function prebuiltMatches(
  prebuilt: string,
  cacheDir: string
): Promise<boolean> {
  if (!existsSync(path.join(prebuilt, "node_modules"))) {
    return false;
  }

  const [wanted, shipped] = await Promise.all([
    readFile(path.join(cacheDir, "package.json"), "utf-8"),
    readFile(path.join(prebuilt, "package.json"), "utf-8"),
  ]);

  return wanted === shipped;
}

export async function installTemplateModules(cacheDir: string): Promise<void> {
  const prebuilt = packagedResource(PREBUILT_TEMPLATE_DIR);

  if (prebuilt && (await prebuiltMatches(prebuilt, cacheDir))) {
    return copyPrebuiltModules(prebuilt, cacheDir);
  }

  return runNpmInstall(cacheDir);
}

export function extensionFor(name: string, mime: string): string {
  const fromName = path.extname(name).slice(1).toLowerCase();

  if (/^[a-z0-9]{1,8}$/.test(fromName)) {
    return fromName;
  }

  return MIME_EXTENSIONS[mime] ?? "bin";
}

export async function linkNodeModules(
  workTree: string,
  sourceModules: string
): Promise<void> {
  const real = await realpath(sourceModules);
  const link = path.join(workTree, "node_modules");

  if (existsSync(link)) {
    return;
  }

  await symlink(real, link, "dir");
}

export async function readJson(file: string): Promise<unknown> {
  return JSON.parse(await readFile(file, "utf-8")) as unknown;
}

export function hasViteDependency(pkg: unknown): boolean {
  if (typeof pkg !== "object" || pkg === null) {
    return false;
  }

  const record = pkg as Record<string, unknown>;

  return ["dependencies", "devDependencies", "peerDependencies"].some(
    (field) => {
      const deps = record[field];

      return typeof deps === "object" && deps !== null && "vite" in deps;
    }
  );
}

export async function pickAppDir(
  apps: AppDetection,
  folder: string,
  requested: string | undefined
): Promise<string> {
  let appDir: string | null;

  if (typeof requested === "string" && requested.trim() !== "") {
    appDir = apps.cleanAppDir(requested);

    if (appDir === null) {
      throw new BadRequestError(
        "appDir must be a folder inside the attached folder"
      );
    }
  } else {
    const detection = await apps.detectApp(folder);

    if (detection.appDir === null && detection.candidates.length > 1) {
      throw new PickAppError(detection.candidates);
    }

    appDir = detection.framework === "next" ? detection.appDir : null;
  }

  if (appDir === null) {
    throw new BadRequestError(
      "no Next.js app found: the folder or one of its apps/* folders needs a package.json with a next dependency and an app/ folder"
    );
  }

  const appRoot = await realpath(path.join(folder, appDir)).catch(() => null);

  if (
    !appRoot ||
    (appRoot !== folder && !appRoot.startsWith(folder + path.sep))
  ) {
    throw new BadRequestError(
      `appDir ${appDir} is not a folder inside ${folder}`
    );
  }

  const pkg = (await readJson(path.join(appRoot, "package.json")).catch(
    () => null
  )) as Record<string, unknown> | null;

  if (apps.frameworkOf(pkg) !== "next") {
    throw new BadRequestError(
      `${appDir} has no next dependency in its package.json`
    );
  }

  return appDir;
}

export async function workspaceAppDir(
  apps: AppDetection,
  folder: string,
  requested: string | undefined
): Promise<{ root: string; appDir: string } | null> {
  const sub =
    typeof requested === "string" && requested.trim() !== ""
      ? apps.cleanAppDir(requested)
      : ".";

  if (sub === null) {
    return null;
  }

  const target = await realpath(path.join(folder, sub)).catch(() => null);
  const workspace = target ? await apps.nextAppWorkspace(target) : null;

  return workspace && workspace.root !== folder
    ? { root: workspace.root, appDir: workspace.appDir }
    : null;
}

export const directionOf = (project: Project, id: string): Direction => {
  const direction = project.directions.find((candidate) => candidate.id === id);

  if (!direction) {
    throw new NotFoundError(
      `direction ${id} not found in project ${project.id}`
    );
  }

  return direction;
};

export const mainDirection = (project: Project): Direction => {
  const direction =
    project.directions.find(
      (candidate) => candidate.id === MAIN_DIRECTION_ID
    ) ?? project.directions[0];

  if (!direction) {
    throw new NotFoundError(`project ${project.id} has no directions`);
  }

  return direction;
};

export const newDirection = (
  id: string,
  name: string,
  workTree: string,
  now: number
): Direction => ({
  id,
  name,
  workTree,
  branch: `d/${id}`,
  headVersionId: null,
  parentVersionId: null,
  sessionId: null,
  createdAt: now,
});

export const newProject = (
  id: string,
  name: string,
  kind: ProjectKind,
  main: Direction,
  now: number
): Project => ({
  id,
  name,
  kind,
  createdAt: now,
  updatedAt: now,
  imported: null,
  entry: "index.html",
  settings: { ...DEFAULT_SETTINGS },
  settingsVersion: SETTINGS_VERSION,
  directions: [main],
});

export const resolveUserFolder = async (
  dataDir: string,
  sourcePath: string
): Promise<string> => {
  if (typeof sourcePath !== "string" || sourcePath.trim() === "") {
    throw new BadRequestError("path is required");
  }

  if (sourcePath.includes("\0")) {
    throw new BadRequestError("invalid path");
  }

  let folder: string;

  try {
    folder = await realpath(path.resolve(sourcePath));
  } catch {
    throw new BadRequestError(`folder not found: ${sourcePath}`);
  }

  if (!(await stat(folder)).isDirectory()) {
    throw new BadRequestError(`not a folder: ${folder}`);
  }

  if (isInsideDataDir(dataDir, folder)) {
    throw new BadRequestError("cannot use a folder inside the studio data dir");
  }

  return folder;
};

export const isInsideDataDir = (dataDir: string, folder: string): boolean => {
  const dataRoot = path.resolve(dataDir);

  return folder === dataRoot || folder.startsWith(dataRoot + path.sep);
};

export const makeNewSubfolder = async (
  parent: string,
  slug: string
): Promise<string> => {
  for (let attempt = 1; attempt <= MAX_SLUG_SUFFIX; attempt += 1) {
    const candidate = path.join(parent, slugCandidate(slug, attempt));

    if (path.dirname(candidate) !== parent) {
      throw new BadRequestError("invalid project folder name");
    }

    try {
      await mkdir(candidate);

      return candidate;
    } catch (error) {
      if (isNodeError(error) && error.code === "EEXIST") {
        continue;
      }

      throw error;
    }
  }

  throw new ConflictError(`no free folder name for ${slug} in ${parent}`);
};
