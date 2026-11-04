import { blocksOf, isTailwindCss } from "./css-vars.js";
import type { CssBlock } from "./css-vars.js";
import type {
  TextStyleProp,
  TextStyleSource,
  TextStyleValues,
} from "./deps.js";
import { cssFiles, tokenJsonFiles } from "./files.js";
import type { SourceFile } from "./files.js";
import { parseJson, toObject } from "./json-source.js";
import type { JsonObject } from "./json-source.js";

interface TokenWrite {
  code: string;
  file: SourceFile;
  source: TextStyleSource;
}

const THEME_SUFFIX: Record<TextStyleProp, string | null> = {
  family: null,
  letterSpacing: "--letter-spacing",
  lineHeight: "--line-height",
  size: "",
  weight: "--font-weight",
};

const ROOT_PREFIX: Record<TextStyleProp, string> = {
  family: "--font-family-",
  letterSpacing: "--letter-spacing-",
  lineHeight: "--line-height-",
  size: "--font-size-",
  weight: "--font-weight-",
};

const JSON_KEY: Record<TextStyleProp, string> = {
  family: "fontFamily",
  letterSpacing: "letterSpacing",
  lineHeight: "lineHeight",
  size: "fontSize",
  weight: "fontWeight",
};

const PROPS: TextStyleProp[] = [
  "size",
  "lineHeight",
  "weight",
  "letterSpacing",
  "family",
];

const GROUP_KEYS = ["typography", "font", "text"];
const INDENT = /\n(?<indent>[ \t]{1,8})\S/u;
const DEFAULT_INDENT = "  ";
const DTCG_MARK = '"$value"';

const indentOf = (body: string): string =>
  INDENT.exec(body)?.groups?.["indent"] ?? DEFAULT_INDENT;

const insertInto = (text: string, block: CssBlock, decls: string[]): string => {
  const indent = indentOf(block.body);
  const head = text.slice(0, block.bodyEnd).trimEnd();
  const lines = decls.map((decl) => `${indent}${decl};`).join("\n");

  return `${head}\n${lines}\n${text.slice(block.bodyEnd)}`;
};

const themeDecls = (name: string, values: TextStyleValues): string[] => {
  const decls: string[] = [];

  for (const prop of PROPS) {
    const suffix = THEME_SUFFIX[prop];
    const value = values[prop];

    if (suffix !== null && value !== null) {
      decls.push(`--text-${name}${suffix}: ${value}`);
    }
  }

  return decls;
};

const rootDecls = (name: string, values: TextStyleValues): string[] => {
  const decls: string[] = [];

  for (const prop of PROPS) {
    const value = values[prop];

    if (value !== null) {
      decls.push(`${ROOT_PREFIX[prop]}${name}: ${value}`);
    }
  }

  return decls;
};

const themeWrite = (
  files: SourceFile[],
  name: string,
  values: TextStyleValues
): TokenWrite | null => {
  for (const file of files) {
    const [block] = blocksOf(file.text, "theme");

    if (block && isTailwindCss(file.text)) {
      const code = insertInto(file.text, block, themeDecls(name, values));

      return { code, file, source: "tailwind-theme" };
    }
  }

  return null;
};

const rootWrite = (
  files: SourceFile[],
  name: string,
  values: TextStyleValues
): TokenWrite | null => {
  for (const file of files) {
    const [block] = blocksOf(file.text, "root");

    if (block) {
      const code = insertInto(file.text, block, rootDecls(name, values));

      return { code, file, source: "css-var" };
    }
  }

  return null;
};

const jsonEntry = (values: TextStyleValues, dtcg: boolean): JsonObject => {
  const entry: JsonObject = {};

  for (const prop of PROPS) {
    const value = values[prop];

    if (value !== null) {
      entry[JSON_KEY[prop]] = value;
    }
  }

  if (dtcg) {
    return { $type: "typography", $value: entry };
  }

  return entry;
};

const withGroupEntry = (
  holder: JsonObject,
  name: string,
  entry: JsonObject
): JsonObject | null => {
  for (const key of GROUP_KEYS) {
    const group = toObject(holder[key] ?? null);

    if (group) {
      return { ...holder, [key]: { ...group, [name]: entry } };
    }
  }

  return null;
};

const withEntry = (
  root: JsonObject,
  name: string,
  entry: JsonObject
): JsonObject | null => {
  const direct = withGroupEntry(root, name, entry);

  if (direct) {
    return direct;
  }

  for (const [key, value] of Object.entries(root)) {
    const nested = toObject(value);
    const changed = nested !== null && withGroupEntry(nested, name, entry);

    if (changed) {
      return { ...root, [key]: changed };
    }
  }

  return null;
};

const jsonWrite = (
  files: SourceFile[],
  name: string,
  values: TextStyleValues
): TokenWrite | null => {
  for (const file of files) {
    const root = parseJson(file.text);
    const entry = jsonEntry(values, file.text.includes(DTCG_MARK));
    const next = root && withEntry(root, name, entry);

    if (next) {
      const code = `${JSON.stringify(next, null, 2)}\n`;

      return { code, file, source: "tokens-json" };
    }
  }

  return null;
};

const planTokenWrite = async (
  workTree: string,
  name: string,
  values: TextStyleValues
): Promise<TokenWrite | null> => {
  const [css, json] = await Promise.all([
    cssFiles(workTree),
    tokenJsonFiles(workTree),
  ]);

  return (
    themeWrite(css, name, values) ??
    jsonWrite(json, name, values) ??
    rootWrite(css, name, values)
  );
};

export { planTokenWrite };

export type { TokenWrite };
