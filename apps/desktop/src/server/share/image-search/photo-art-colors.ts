import { readFile } from "node:fs/promises";
import path from "node:path";

import { FALLBACK_COLORS } from "./engine/index.js";
import type { PhotoArtColors } from "./engine/index.js";
import type { PhotoPage } from "./photo-pick.js";

const ROOT_BLOCK = /:root[^{]*\{(?<body>[^}]*)\}/u;

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

const toVariables = (sources: readonly string[]): Map<string, string> => {
  const variables = new Map<string, string>();

  for (const source of sources) {
    const body = ROOT_BLOCK.exec(source)?.groups?.body ?? "";

    for (const part of body.split(";")) {
      const text = part.trim();
      const colon = text.indexOf(":");
      const name = text.slice("--".length, Math.max(colon, 0)).trim();
      const value = text.slice(colon + 1).trim();

      if (text.startsWith("--") && colon > 0 && name !== "" && value !== "") {
        variables.set(name, value);
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

const toArtColors = async (
  workTree: string,
  page: PhotoPage
): Promise<PhotoArtColors> => {
  const linked = await toLinkedCss(workTree, page);

  const inline = toStyleBlocks(page.source);

  const variables = toVariables([...linked, ...inline]);

  return {
    accent: toColor(variables, COLOR_NAMES.accent, FALLBACK_COLORS.accent),
    ink: toColor(variables, COLOR_NAMES.ink, FALLBACK_COLORS.ink),
    primary: toColor(variables, COLOR_NAMES.primary, FALLBACK_COLORS.primary),
    surface: toColor(variables, COLOR_NAMES.surface, FALLBACK_COLORS.surface),
  };
};

export { toArtColors };
