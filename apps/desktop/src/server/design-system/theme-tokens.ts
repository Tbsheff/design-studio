import { TOKENS_FILE } from "@design-studio/contracts";
import type {
  CompiledTokenEntry,
  Direction,
  PackManifest,
  Project,
  TokenChange,
} from "@design-studio/contracts";

import type { DirectEditDeps } from "../events/index.js";
import { appTokensFor } from "./app-tokens/source.js";
import { updateAppTokens } from "./app-tokens/write.js";
import { readDesignSystemFiles } from "./sync.js";
import { updateTokensTitled } from "./update-tokens.js";

const APPLY_TITLE = "Apply theme";

interface ThemeTokenBase {
  readonly entries: readonly CompiledTokenEntry[];
  readonly file: string;
}

interface ThemePackFonts {
  readonly body: string | null;
  readonly display: string | null;
  readonly googleFontsUrl: string | null;
}

interface ThemeTokenWrite {
  readonly changes: readonly TokenChange[];
  readonly fonts: ThemePackFonts | null;
}

interface ThemeTokensWritten {
  readonly file: string;
  readonly versionId: string;
}

const getThemeTokenBase = async (
  project: Project,
  direction: Direction
): Promise<ThemeTokenBase | null> => {
  const app = await appTokensFor(project, direction);

  if (app) {
    return { entries: app.entries, file: app.file };
  }

  const files = await readDesignSystemFiles(direction.workTree);

  if (files === null || files.tokens === null) {
    return null;
  }

  return { entries: files.entries, file: TOKENS_FILE };
};

const FAMILY_PARAM = /family=(?<family>[^:&]+)/gu;

const toLinkFamilies = (url: string): readonly string[] =>
  [...url.matchAll(FAMILY_PARAM)].map((match) => match.groups?.family ?? "");

const isLinkCovered = (current: string | null, wanted: string): boolean => {
  if (current === null) {
    return false;
  }

  const loaded = new Set(toLinkFamilies(current));

  return toLinkFamilies(wanted).every((family) => loaded.has(family));
};

const toFontLink = (
  current: PackManifest["fonts"],
  fonts: ThemePackFonts
): PackManifest["fonts"] => {
  const link = current.googleFontsUrl ?? null;

  if (
    fonts.googleFontsUrl === null ||
    isLinkCovered(link, fonts.googleFontsUrl)
  ) {
    return current;
  }

  return { ...current, googleFontsUrl: fonts.googleFontsUrl };
};

const toPackFonts = (
  current: PackManifest["fonts"],
  fonts: ThemePackFonts
): PackManifest["fonts"] => ({
  ...toFontLink(current, fonts),
  body: fonts.body ?? current.body,
  display: fonts.display ?? current.display,
});

const toThemePackText = async (
  workTree: string,
  fonts: ThemePackFonts | null
): Promise<string | null> => {
  if (fonts === null) {
    return null;
  }

  const files = await readDesignSystemFiles(workTree);
  const manifest = files?.manifest ?? null;

  if (manifest === null) {
    return null;
  }

  const next = { ...manifest, fonts: toPackFonts(manifest.fonts, fonts) };

  if (JSON.stringify(next) === JSON.stringify(manifest)) {
    return null;
  }

  return `${JSON.stringify(next, null, 2)}\n`;
};

const updateThemeTokens = async (
  deps: DirectEditDeps,
  project: Project,
  direction: Direction,
  theme: ThemeTokenWrite
): Promise<ThemeTokensWritten> => {
  const { changes, fonts } = theme;
  const request = { raw: { changes }, title: APPLY_TITLE };
  const app = await updateAppTokens(deps, project, direction, request);

  if (app) {
    const found = await appTokensFor(project, direction);

    return { file: found?.file ?? "", versionId: app.version.id };
  }

  const packText = await toThemePackText(direction.workTree, fonts);

  const written = await updateTokensTitled(deps, project, direction, {
    ...request,
    packText,
  });

  return { file: TOKENS_FILE, versionId: written.version.id };
};

export { APPLY_TITLE, getThemeTokenBase, updateThemeTokens };

export type { ThemePackFonts, ThemeTokenBase, ThemeTokensWritten };
