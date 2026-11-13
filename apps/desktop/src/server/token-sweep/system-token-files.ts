import { TOKENS_CSS_FILE, TOKENS_FILE } from "@design-studio/contracts";
import type { DesignToken, TokenGroup } from "@design-studio/contracts";

import {
  compileTokens,
  DESIGN_MD_FILE,
  parseTokenFile,
  upsertTokenBlock,
} from "./deps.js";
import type { CompiledTokenEntry } from "./deps.js";
import type { FileChange } from "./token-edit-types.js";

type TokenNode = DesignToken | TokenGroup | string;

interface SystemTexts {
  readonly css: string;
  readonly markdown: string | null;
  readonly mode: "dark" | "light";
  readonly tokens: string;
}

interface SystemEdit {
  readonly conflict: string | null;
  readonly files: readonly FileChange[];
  readonly problem: string | null;
}

const MAX_ERRORS = 3;
const JSON_INDENT = 2;
const VAR_PREFIX = "--";

const toProblem = (problem: string): SystemEdit => ({
  conflict: null,
  files: [],
  problem,
});

const toConflict = (conflict: string): SystemEdit => ({
  conflict,
  files: [],
  problem: null,
});

const isSystemToken = (entry: CompiledTokenEntry): boolean => !entry.source;

const isGeneratedFile = (
  entry: CompiledTokenEntry,
  relative: string
): boolean => isSystemToken(entry) && relative === TOKENS_CSS_FILE;

const toChild = (node: TokenGroup, key: string): TokenGroup | null => {
  const child = node[key];

  if (child instanceof Object && !("$value" in child)) {
    return child;
  }

  return null;
};

const toNodeAt = (
  node: TokenGroup,
  segments: readonly string[]
): TokenNode | null => {
  const [head = "", ...rest] = segments;

  if (rest.length === 0) {
    return node[head] ?? null;
  }

  const child = toChild(node, head);

  if (child === null) {
    return null;
  }

  return toNodeAt(child, rest);
};

const toWithout = (
  node: TokenGroup,
  segments: readonly string[]
): TokenGroup => {
  const [head = "", ...rest] = segments;

  if (rest.length === 0) {
    return Object.fromEntries(
      Object.entries(node).filter(([key]) => key !== head)
    );
  }

  const child = toChild(node, head);

  if (child === null) {
    return node;
  }

  return { ...node, [head]: toWithout(child, rest) };
};

const toWith = (
  node: TokenGroup,
  segments: readonly string[],
  value: TokenNode
): TokenGroup => {
  const [head = "", ...rest] = segments;

  if (rest.length === 0) {
    return { ...node, [head]: value };
  }

  return { ...node, [head]: toWith(toChild(node, head) ?? {}, rest, value) };
};

const toNewPath = (entryPath: string, newName: string): string | null => {
  const [group = ""] = entryPath.split(".");

  if (group === "color") {
    return `color.${newName.slice(VAR_PREFIX.length)}`;
  }

  const prefix = `${VAR_PREFIX}${group}-`;

  if (!newName.startsWith(prefix) || newName.length === prefix.length) {
    return null;
  }

  return `${group}.${newName.slice(prefix.length)}`;
};

const toJsonText = (root: TokenGroup, before: string): string => {
  const text = JSON.stringify(root, null, JSON_INDENT);

  if (before.endsWith("\n")) {
    return `${text}\n`;
  }

  return text;
};

const toChange = (
  relative: string,
  before: string,
  after: string
): FileChange[] => {
  if (before === after) {
    return [];
  }

  return [{ after, before, relative }];
};

const toMarkdownChange = (
  markdown: string | null,
  entries: CompiledTokenEntry[]
): FileChange[] => {
  if (markdown === null) {
    return [];
  }

  return toChange(
    DESIGN_MD_FILE,
    markdown,
    upsertTokenBlock(markdown, entries)
  );
};

const toSystemEdit = (texts: SystemTexts, root: TokenGroup): SystemEdit => {
  const after = toJsonText(root, texts.tokens);
  const parsed = parseTokenFile(after);

  if (parsed.file === null) {
    return toProblem(parsed.error ?? "tokens.json is not valid.");
  }

  const compiled = compileTokens(parsed.file, { mode: texts.mode });

  if (compiled.errors.length > 0) {
    return toProblem(
      `design-system/tokens.json does not compile: ${compiled.errors.slice(0, MAX_ERRORS).join("; ")}`
    );
  }

  return {
    conflict: null,
    files: [
      ...toChange(TOKENS_FILE, texts.tokens, after),
      ...toChange(TOKENS_CSS_FILE, texts.css, compiled.css),
      ...toMarkdownChange(texts.markdown, compiled.entries),
    ],
    problem: null,
  };
};

const toRoot = (text: string): TokenGroup | null => parseTokenFile(text).file;

const toSystemRename = (
  texts: SystemTexts,
  entry: CompiledTokenEntry,
  newName: string
): SystemEdit => {
  const newPath = toNewPath(entry.path, newName);
  const [group = ""] = entry.path.split(".");

  if (newPath === null) {
    return toProblem(
      `The new name must start with ${VAR_PREFIX}${group}-, so the token stays in the ${group} group.`
    );
  }

  const root = toRoot(
    texts.tokens.replaceAll(`{${entry.path}}`, `{${newPath}}`)
  );

  const newSegments = newPath.split(".");
  const oldSegments = entry.path.split(".");

  if (root === null) {
    return toProblem("design-system/tokens.json is not valid.");
  }

  const node = toNodeAt(root, oldSegments);

  if (node === null || toNodeAt(root, newSegments) !== null) {
    return toConflict(
      `The path ${newPath} is in use in tokens.json. Pick another name.`
    );
  }

  return toSystemEdit(
    texts,
    toWith(toWithout(root, oldSegments), newSegments, node)
  );
};

const toSystemDelete = (
  texts: SystemTexts,
  entry: CompiledTokenEntry
): SystemEdit => {
  const root = toRoot(texts.tokens);

  if (root === null) {
    return toProblem("design-system/tokens.json is not valid.");
  }

  if (texts.tokens.includes(`{${entry.path}}`)) {
    return toConflict(
      `Another token refers to ${entry.cssVar}. Change that token before you delete this one.`
    );
  }

  return toSystemEdit(texts, toWithout(root, entry.path.split(".")));
};

export { isGeneratedFile, isSystemToken, toSystemDelete, toSystemRename };

export type { SystemEdit, SystemTexts };
