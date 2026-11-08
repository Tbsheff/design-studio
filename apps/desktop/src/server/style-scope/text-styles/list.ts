import { cssVarStyles } from "./css-source.js";
import { TEXT_STYLE_LIST_DEFAULT } from "./deps.js";
import type { TextStyle, TextStyleList, TextStyleSource } from "./deps.js";
import { designMdStyles } from "./design-md-source.js";
import { tokenJsonStyles } from "./json-source.js";
import { themeStyles } from "./theme-source.js";

interface TextStyleScope {
  workTree: string;
}

interface TextStyleQuery {
  limit?: number | undefined;
  query?: string | undefined;
}

class TextStyleError extends Error {
  public override name = "TextStyleError";
}

const KNOWN_HINT_MAX = 20;

const READERS: ((workTree: string) => Promise<TextStyle[]>)[] = [
  themeStyles,
  tokenJsonStyles,
  cssVarStyles,
  designMdStyles,
];

const toAllTextStyles = async (workTree: string): Promise<TextStyle[]> => {
  const found = await Promise.all(READERS.map((read) => read(workTree)));
  const seen = new Set<string>();
  const styles: TextStyle[] = [];

  for (const style of found.flat()) {
    if (style.name && !seen.has(style.name)) {
      seen.add(style.name);
      styles.push(style);
    }
  }

  return styles;
};

const toSourcesOf = (styles: TextStyle[]): TextStyleSource[] => [
  ...new Set(styles.map((style) => style.source)),
];

const toMatching = (
  styles: TextStyle[],
  query: string | undefined
): TextStyle[] => {
  const needle = query?.trim().toLowerCase() ?? "";

  if (needle === "") {
    return styles;
  }

  return styles.filter((style) => style.name.includes(needle));
};

const listTextStyles = async (
  scope: TextStyleScope,
  query: TextStyleQuery
): Promise<TextStyleList> => {
  const styles = await toAllTextStyles(scope.workTree);
  const hits = toMatching(styles, query.query);

  return {
    sources: toSourcesOf(styles),
    styles: hits.slice(0, query.limit ?? TEXT_STYLE_LIST_DEFAULT),
    total: hits.length,
  };
};

const toKnownHint = (styles: TextStyle[]): string => {
  const known = styles.map((style) => style.name).slice(0, KNOWN_HINT_MAX);

  if (known.length === 0) {
    return "";
  }

  return ` Known: ${known.join(", ")}.`;
};

const toFindTextStyle = async (
  workTree: string,
  name: string
): Promise<TextStyle> => {
  const styles = await toAllTextStyles(workTree);
  const key = name.trim().toLowerCase();
  const found = styles.find((style) => style.name === key);

  if (!found) {
    throw new TextStyleError(
      `No text style named "${name}". Run list_text_styles.${toKnownHint(styles)}`
    );
  }

  return found;
};

export {
  toAllTextStyles as allTextStyles,
  toFindTextStyle as findTextStyle,
  listTextStyles,
  TextStyleError,
};

export type { TextStyleQuery, TextStyleScope };
