import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

import { FALLBACK_COLORS } from "./engine/index.js";
import type { PhotoArtColors } from "./engine/index.js";
import type { PhotoPage } from "./photo-pick.js";

const DARK_MEDIA = /@media \(prefers-color-scheme: ?dark\) ?\{/giu;

const DARK_PREFIX = /prefers-color-scheme: ?dark/iu;

const DARK_SELECTOR = /\.dark\b|\[data-theme=["']?dark["']?\]/u;

const SHEET_NAME = "photo-art.css";

const CSS_FILE = /\.css$/iu;

const STYLE_OPEN = /<style\b/iu;

const STYLE_CLOSE = "/style>";

const LINK_OPEN = /<link\b/iu;

const HREF_KEY = " href=";

const REMOTE = /^(?:[a-z]+:)?\/\//iu;

const VAR_DEPTH = 4;

const COLOR_NAMES: Readonly<Record<keyof PhotoArtColors, readonly string[]>> = {
  accent: ["accent", "secondary", "highlight", "cta"],
  ink: ["fg", "ink", "foreground", "text"],
  primary: ["primary", "brand", "cta", "accent"],
  surface: ["surface", "bg", "background", "paper", "card"],
};

const toReadText = async (file: string): Promise<string> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return "";
  }
};

const toHref = (tag: string): string => {
  const start = tag.indexOf(HREF_KEY);

  if (start === -1) {
    return "";
  }

  const quote = tag.charAt(start + HREF_KEY.length);
  const from = start + HREF_KEY.length + 1;
  const end = tag.indexOf(quote, from);

  if ((quote !== '"' && quote !== "'") || end === -1) {
    return "";
  }

  return tag.slice(from, end);
};

const toDistinctAccent = (accent: string, primary: string): string => {
  if (accent.toLowerCase() !== primary.toLowerCase()) {
    return accent;
  }

  return FALLBACK_COLORS.accent;
};

const toStyleBlocks = (source: string): readonly string[] =>
  source
    .split(STYLE_OPEN)
    .slice(1)
    .map((part) => {
      const start = part.indexOf(">") + 1;
      const end = part.indexOf(STYLE_CLOSE);

      if (start === 0 || end < start) {
        return "";
      }

      return part.slice(start, end - 1);
    });

interface VarReference {
  readonly fallback: string | null;
  readonly name: string;
}

const toVarReference = (value: string): VarReference | null => {
  const text = value.trim();

  if (!text.startsWith("var(--") || !text.endsWith(")")) {
    return null;
  }

  const inner = text.slice("var(--".length, -1);
  const comma = inner.indexOf(",");

  if (comma === -1) {
    return { fallback: null, name: inner.trim() };
  }

  return {
    fallback: inner.slice(comma + 1).trim(),
    name: inner.slice(0, comma).trim(),
  };
};

const toLinkedCss = async (
  workTree: string,
  page: PhotoPage
): Promise<readonly string[]> => {
  const tags = page.source
    .split(LINK_OPEN)
    .slice(1)
    .map((part) => part.slice(0, Math.max(part.indexOf(">"), 0)));

  const hrefs = tags.flatMap((tag) => {
    const href = toHref(` ${tag.trim()}`);

    if (!href.endsWith(".css") || REMOTE.test(href)) {
      return [];
    }

    const file = path.resolve(path.dirname(page.file), href);

    if (!file.startsWith(`${workTree}${path.sep}`)) {
      return [];
    }

    return [file];
  });

  return await Promise.all(hrefs.map((file) => toReadText(file)));
};

interface CssBlock {
  readonly body: string;
  readonly isDarkMedia: boolean;
  readonly selector: string;
}

const toCloseIndex = (text: string, from: number): number => {
  let depth = 1;

  for (let index = from; index < text.length; index += 1) {
    const char = text.charAt(index);

    if (char === "{") {
      depth += 1;
    }

    if (char === "}") {
      depth -= 1;
    }

    if (depth === 0) {
      return index;
    }
  }

  return text.length;
};

const toFlatBlocks = (text: string, isMedia: boolean): CssBlock[] =>
  text.split("}").flatMap((chunk) => {
    const open = chunk.lastIndexOf("{");

    if (open === -1) {
      return [];
    }

    const prefix = chunk.slice(0, open);
    const selector = prefix.split("{").at(-1) ?? "";
    const isDarkPrefix = DARK_PREFIX.test(prefix);

    return [
      {
        body: chunk.slice(open + 1),
        isDarkMedia: isMedia || isDarkPrefix,
        selector: selector.trim(),
      },
    ];
  });

const toCssBlocks = (text: string): readonly CssBlock[] => {
  const media: CssBlock[] = [];
  const rest: string[] = [];
  let cursor = 0;

  for (const match of text.matchAll(DARK_MEDIA)) {
    if (match.index >= cursor) {
      const open = match.index + match[0].length;
      const close = toCloseIndex(text, open);

      rest.push(text.slice(cursor, match.index));
      media.push(...toFlatBlocks(text.slice(open, close), true));
      cursor = close + 1;
    }
  }

  rest.push(text.slice(cursor));

  return [...toFlatBlocks(rest.join("\n"), false), ...media];
};

const isDarkSelector = (selector: string): boolean =>
  DARK_SELECTOR.test(selector);

const isLightBlock = (block: CssBlock): boolean =>
  !block.isDarkMedia &&
  block.selector.includes(":root") &&
  !isDarkSelector(block.selector);

const setDeclarations = (
  variables: Map<string, string>,
  body: string
): void => {
  for (const part of body.split(";")) {
    const text = part.trim();
    const colon = text.indexOf(":");
    const name = text.slice("--".length, Math.max(colon, 0)).trim();
    const value = text.slice(colon + 1).trim();

    if (text.startsWith("--") && colon > 0 && name !== "" && value !== "") {
      variables.set(name, value);
    }
  }
};

const toVariables = (
  sources: readonly string[],
  isPicked: (block: CssBlock) => boolean,
  base: ReadonlyMap<string, string>
): Map<string, string> => {
  const variables = new Map(base);

  for (const source of sources) {
    for (const block of toCssBlocks(source)) {
      if (isPicked(block)) {
        setDeclarations(variables, block.body);
      }
    }
  }

  return variables;
};

const toResolved = (
  variables: ReadonlyMap<string, string>,
  value: string | null,
  depth: number
): string | null => {
  if (value === null || depth > VAR_DEPTH) {
    return null;
  }

  const reference = toVarReference(value);

  if (reference === null) {
    return value.trim();
  }

  const named = toResolved(
    variables,
    variables.get(reference.name) ?? null,
    depth + 1
  );

  return named ?? toResolved(variables, reference.fallback, depth + 1);
};

const toColor = (
  variables: ReadonlyMap<string, string>,
  names: readonly string[],
  fallback: string
): string => {
  for (const name of names) {
    const value =
      toResolved(variables, variables.get(name) ?? null, 0) ??
      toResolved(variables, variables.get(`color-${name}`) ?? null, 0);

    if (value !== null) {
      return value;
    }
  }

  return fallback;
};

const TOKEN_FILES = ["design-system/tokens.css", "tokens.css"];

const toReadNames = async (folder: string): Promise<readonly string[]> => {
  try {
    return await readdir(folder);
  } catch {
    return [];
  }
};

const toFolderCss = async (page: PhotoPage): Promise<readonly string[]> => {
  const folder = path.dirname(page.file);
  const names = await toReadNames(folder);

  const picked = names.filter(
    (name) => CSS_FILE.test(name) && name !== SHEET_NAME
  );

  return await Promise.all(
    picked.map((name) => toReadText(path.join(folder, name)))
  );
};

const toPageCss = async (
  workTree: string,
  page: PhotoPage
): Promise<readonly string[]> => {
  if (/\.html?$/iu.test(page.relative)) {
    return await toLinkedCss(workTree, page);
  }

  return await toFolderCss(page);
};

const toArtSources = async (
  workTree: string,
  page: PhotoPage
): Promise<readonly string[]> => {
  const [tokens, linked] = await Promise.all([
    Promise.all(
      TOKEN_FILES.map((name) => toReadText(path.join(workTree, name)))
    ),
    toPageCss(workTree, page),
  ]);

  return [...tokens, ...linked, ...toStyleBlocks(page.source)];
};

const toColorsOf = (variables: ReadonlyMap<string, string>): PhotoArtColors => {
  const main = toColor(variables, COLOR_NAMES.primary, FALLBACK_COLORS.primary);

  const accent = toColor(variables, COLOR_NAMES.accent, FALLBACK_COLORS.accent);

  return {
    accent: toDistinctAccent(accent, main),
    ink: toColor(variables, COLOR_NAMES.ink, FALLBACK_COLORS.ink),
    primary: main,
    surface: toColor(variables, COLOR_NAMES.surface, FALLBACK_COLORS.surface),
  };
};

const toLightVariables = (sources: readonly string[]): Map<string, string> =>
  toVariables(sources, isLightBlock, new Map());

const toArtColors = async (
  workTree: string,
  page: PhotoPage
): Promise<PhotoArtColors> =>
  toColorsOf(toLightVariables(await toArtSources(workTree, page)));

export {
  SHEET_NAME,
  isDarkSelector,
  toArtColors,
  toArtSources,
  toColorsOf,
  toLightVariables,
  toVariables,
};

export type { CssBlock };
