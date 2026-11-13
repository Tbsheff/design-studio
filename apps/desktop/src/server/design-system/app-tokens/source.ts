import { readFile, realpath, stat } from "node:fs/promises";

import type {
  AppTokenOrigin,
  AppTokenSource,
  CompiledTokenEntry,
  DesignSystemState,
  Direction,
  Project,
} from "@design-studio/contracts";

import { readDesignSystemFiles } from "../sync.js";
import { findTokenFile, safeFileInside } from "./detect.js";
import { readCssTokens } from "./read-css.js";
import type { CssTokenSheet } from "./read-css.js";
import { appTokenEntries, buildAppTokens } from "./tokens.js";
import type { AppToken } from "./tokens.js";

export interface LoadedAppTokens {
  root: string;
  file: string;
  absolute: string;
  text: string;
  sheet: CssTokenSheet;
  tokens: AppToken[];
  entries: CompiledTokenEntry[];
  summary: AppTokenSource;
}

const cache = new Map<string, { stamp: string; loaded: LoadedAppTokens }>();

export const PROTOTYPE_TOKENS_FILE = "tokens.css";

export function isAppPrototype(project: Project): boolean {
  return (
    project.imported !== null &&
    project.imported.created === true &&
    (project.appProjectId ?? "") !== ""
  );
}

export function usesAppTokens(project: Project): boolean {
  return (
    project.imported !== null &&
    (project.imported.created !== true || isAppPrototype(project)) &&
    !project.designSystemFor
  );
}

export function parseAppTokens(
  root: string,
  file: string,
  absolute: string,
  text: string
): LoadedAppTokens {
  const sheet = readCssTokens(text);
  const tokens = buildAppTokens(sheet);

  return {
    absolute,
    entries: appTokenEntries(tokens, file),
    file,
    root,
    sheet,
    summary: {
      darkTokens: tokens.filter((token) => token.dark).length,
      declarations: sheet.declarations.length,
      file,
      kind: "css",
      tailwind: sheet.tailwind,
      tokens: tokens.length,
    },
    text,
    tokens,
  };
}

export async function readAppTokensAt(
  root: string,
  file: string
): Promise<LoadedAppTokens | null> {
  const realRoot = await realpath(root).catch(() => null);
  const absolute = realRoot ? await safeFileInside(realRoot, file) : null;

  if (!realRoot || !absolute) {
    return null;
  }

  const info = await stat(absolute);
  const stamp = `${info.mtimeMs}:${info.size}`;
  const cached = cache.get(absolute);

  if (cached?.stamp === stamp && cached.loaded.file === file) {
    return cached.loaded;
  }

  const loaded = parseAppTokens(
    realRoot,
    file,
    absolute,
    await readFile(absolute, "utf-8")
  );

  cache.set(absolute, { loaded, stamp });

  return loaded;
}

export async function loadAppTokens(
  workTree: string
): Promise<LoadedAppTokens | null> {
  const file = await findTokenFile(workTree);

  return file ? readAppTokensAt(workTree, file) : null;
}

const PROTOTYPE_HEADER =
  /^\/\* Design tokens of (?<appName>.*) \((?<file>[^()]*)\)\. Design Studio writes this file\. \*\//mu;

const NO_TOKEN_FILE = "no token file found";

export function toTokenOrigin(text: string): AppTokenOrigin | null {
  const groups = PROTOTYPE_HEADER.exec(text)?.groups;
  const appName = groups?.["appName"] ?? "";
  const file = groups?.["file"] ?? "";

  if (appName === "" || file === "" || file === NO_TOKEN_FILE) {
    return null;
  }

  return { appName, file };
}

export async function getProjectTokens(
  project: Project,
  workTree: string
): Promise<LoadedAppTokens | null> {
  if (!isAppPrototype(project)) {
    return loadAppTokens(workTree);
  }

  const loaded = await readAppTokensAt(workTree, PROTOTYPE_TOKENS_FILE);

  if (loaded === null) {
    return null;
  }

  return {
    ...loaded,
    summary: { ...loaded.summary, origin: toTokenOrigin(loaded.text) },
  };
}

export async function appTokensFor(
  project: Project,
  direction: Direction
): Promise<LoadedAppTokens | null> {
  if (!usesAppTokens(project)) {
    return null;
  }

  if (await readDesignSystemFiles(direction.workTree)) {
    return null;
  }

  return getProjectTokens(project, direction.workTree);
}

export function appTokenState(loaded: LoadedAppTokens): DesignSystemState {
  return {
    css: null,
    entries: loaded.entries,
    errors: [],
    manifest: null,
    packId: null,
    source: loaded.summary,
    tokens: null,
  };
}
