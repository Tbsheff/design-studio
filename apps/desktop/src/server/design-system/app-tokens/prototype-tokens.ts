import { findWorkspaceRoot } from "../../app/index.js";
import { toPrototypeCss } from "../engine/to-prototype-css.js";
import type { PrototypeFonts } from "../engine/to-prototype-css.js";
import { harvestNextFonts } from "../extract/next-font.js";
import { getAppDirTokenFile } from "./detect.js";
import { readCssTokens } from "./read-css.js";
import { loadAppTokens, readAppTokensAt } from "./source.js";
import type { LoadedAppTokens } from "./source.js";

interface PrototypeTokenCss {
  readonly css: string | null;
  readonly file: string | null;
  readonly tokens: number;
}

interface TokenDiff {
  readonly added: number;
  readonly changed: number;
  readonly removed: number;
}

interface FontCandidate {
  readonly token: string;
  readonly value?: string;
}

const toNullOnError = async <Value>(
  task: () => Promise<Value>
): Promise<Value | null> => {
  try {
    return await task();
  } catch {
    return null;
  }
};

const toFontValue = (
  candidates: readonly FontCandidate[],
  token: string
): string | null =>
  candidates.find((candidate) => candidate.token === token)?.value ?? null;

const getWorkspaceTokens = async (
  folder: string
): Promise<LoadedAppTokens | null> => {
  const workspace = await toNullOnError(() => findWorkspaceRoot(folder));

  if (workspace === null) {
    return null;
  }

  const file = await getAppDirTokenFile(workspace.root, workspace.appDir);

  if (file === null) {
    return null;
  }

  return readAppTokensAt(workspace.root, file);
};

const getAppTokensIn = async (
  folder: string
): Promise<LoadedAppTokens | null> => {
  const own = await toNullOnError(() => loadAppTokens(folder));

  if (own !== null) {
    return own;
  }

  return toNullOnError(() => getWorkspaceTokens(folder));
};

const toPrototypeTokenCss = async (
  folder: string,
  appName: string
): Promise<PrototypeTokenCss> => {
  const [loaded, harvested] = await Promise.all([
    getAppTokensIn(folder),
    toNullOnError(() => harvestNextFonts(folder)),
  ]);

  const candidates = harvested?.candidates ?? [];

  const fonts: PrototypeFonts = {
    googleFontsUrl: harvested?.googleFontsUrl ?? null,
    mono: toFontValue(candidates, "font.mono"),
    sans: toFontValue(candidates, "font.body"),
  };

  const declarations = (loaded?.sheet.declarations ?? []).map((entry) => ({
    name: entry.name,
    scope: entry.scope,
    value: entry.value,
  }));

  const file = loaded?.file ?? null;
  const tokens = loaded?.tokens.length ?? 0;

  if (file === null && candidates.length === 0) {
    return { css: null, file, tokens };
  }

  return {
    css: toPrototypeCss({ appName, declarations, file, fonts }),
    file,
    tokens,
  };
};

const toDeclarationMap = (css: string | null): Map<string, string> => {
  if (css === null) {
    return new Map();
  }

  return new Map(
    readCssTokens(css).declarations.map((entry) => [
      `${entry.scope}:${entry.name}`,
      entry.value.trim(),
    ])
  );
};

const toTokenDiff = (before: string | null, after: string): TokenDiff => {
  const old = toDeclarationMap(before);
  const next = toDeclarationMap(after);
  let added = 0;
  let changed = 0;

  for (const [key, value] of next) {
    if (!old.has(key)) {
      added += 1;
    }

    if (old.has(key) && old.get(key) !== value) {
      changed += 1;
    }
  }

  const removed = [...old.keys()].filter((key) => !next.has(key)).length;

  return { added, changed, removed };
};

export { getAppTokensIn, toPrototypeTokenCss, toTokenDiff };

export type { PrototypeTokenCss, TokenDiff };
