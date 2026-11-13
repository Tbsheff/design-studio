import { readFile } from "node:fs/promises";
import path from "node:path";

import { findTokenFile } from "../design-system/app-tokens/detect.js";
import {
  isAppPrototype,
  PROTOTYPE_TOKENS_FILE,
  readAppTokensAt,
  usesAppTokens,
} from "../design-system/app-tokens/source.js";
import { DESIGN_MD_FILE } from "../design-system/packs.js";
import { readDesignSystemFiles } from "../design-system/sync.js";
import type { ExportSource } from "../project-source/index.js";
import { attemptNull } from "./attempt-null.js";
import { resolveFrameSource } from "./frame-source.js";
import type { FrameDeps, FrameSourceQuery } from "./frame-source.js";

const NO_TOKENS = "This version has no design system and no app token file.";

const NO_DESIGN_MD = "This project has no DESIGN.md.";

type DesignSystemFiles = NonNullable<
  Awaited<ReturnType<typeof readDesignSystemFiles>>
>;

type Manifest = NonNullable<DesignSystemFiles["manifest"]>;

type TokenEntry = DesignSystemFiles["entries"][number];

interface PackView {
  readonly fonts: Manifest["fonts"];
  readonly id: Manifest["id"];
  readonly mode: Manifest["mode"];
  readonly name: Manifest["name"];
}

interface TokenEntryView {
  readonly cssVar: TokenEntry["cssVar"];
  readonly dark: TokenEntry["darkValue"];
  readonly description?: string;
  readonly token: TokenEntry["path"];
  readonly type: TokenEntry["type"];
  readonly value: TokenEntry["value"];
}

interface TokensView {
  readonly errors?: DesignSystemFiles["errors"];
  readonly pack?: PackView | null;
  readonly source?: unknown;
  readonly text?: string;
  readonly tokens: readonly unknown[];
  readonly tokensCss?: string;
}

interface DesignMd {
  readonly text: string;
}

const readAppTokenView = async (
  src: ExportSource
): Promise<TokensView | null> => {
  if (!usesAppTokens(src.project)) {
    return null;
  }

  let file: string | null = PROTOTYPE_TOKENS_FILE;

  if (!isAppPrototype(src.project)) {
    file = await findTokenFile(src.direction.workTree);
  }

  if (!file) {
    return null;
  }

  const loaded = await readAppTokensAt(src.root, file);

  if (!loaded) {
    return null;
  }

  return {
    source: { ...loaded.summary, versionId: src.version.id },
    tokens: loaded.entries.map((entry) => ({
      dark: entry.source?.darkValue ?? null,
      darkLine: entry.source?.darkLine ?? null,
      darkResolved: entry.darkValue,
      file: entry.source?.file,
      group: entry.path.split(".")[0],
      line: entry.source?.line,
      path: entry.path,
      resolved: entry.value,
      token: entry.cssVar,
      type: entry.type,
      value: entry.source?.value ?? entry.value,
    })),
  };
};

const toPack = (manifest: DesignSystemFiles["manifest"]): PackView | null => {
  if (!manifest) {
    return null;
  }

  return {
    fonts: manifest.fonts,
    id: manifest.id,
    mode: manifest.mode,
    name: manifest.name,
  };
};

const toTokenEntry = (entry: TokenEntry): TokenEntryView => {
  const base = {
    cssVar: entry.cssVar,
    dark: entry.darkValue,
    token: entry.path,
    type: entry.type,
    value: entry.value,
  };

  if (!entry.description) {
    return base;
  }

  return { ...base, description: entry.description };
};

const readTokens = async (
  deps: FrameDeps,
  query: FrameSourceQuery
): Promise<TokensView> => {
  const src = await resolveFrameSource(deps, query, false);
  const files = await readDesignSystemFiles(src.root);

  if (!files) {
    const appView = await readAppTokenView(src);

    return appView ?? { text: NO_TOKENS, tokens: [] };
  }

  const view: TokensView = {
    errors: files.errors,
    pack: toPack(files.manifest),
    tokens: files.entries.map((entry) => toTokenEntry(entry)),
  };

  if (files.css === null) {
    return view;
  }

  return { ...view, tokensCss: files.css };
};

const readDesignMd = async (
  deps: FrameDeps,
  query: FrameSourceQuery
): Promise<DesignMd> => {
  const src = await resolveFrameSource(deps, query, false);

  const text = await attemptNull(() =>
    readFile(path.join(src.root, DESIGN_MD_FILE), "utf-8")
  );

  return { text: text ?? NO_DESIGN_MD };
};

export { readDesignMd, readTokens };

export type { DesignMd, TokensView };
