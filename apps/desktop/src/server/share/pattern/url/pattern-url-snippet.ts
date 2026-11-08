import { createHash } from "node:crypto";

import { buildClassSheet, renderPage } from "../../page-import/index.js";
import type {
  Capture,
  CapturedNode,
  ClassSheet,
  CompiledTokenEntry,
} from "../../page-import/index.js";

const PREFIX_CHARS = 6;

const STYLE_OPEN = ["<", "style", ">"].join("");

const STYLE_CLOSE = ["</", "style", ">"].join("");

const STYLE_BLOCK = /<style>\n(?<css>[\s\S]*?)\n<\/style>/u;

const BODY_BLOCK = /<body>(?<html>[\s\S]*)<\/body>/u;

const VAR_USE = /var\((?<name>--[\w-]+)\)/gu;

const TOKEN_USE = /var\((?<name>--[\w-]+)/gu;

const CLASS_RULE = /^\.(?<name>s\d+)\{/u;

const UNSAFE_CSS = /[<>{};]/gu;

const GLOBAL_LINES = new Set([
  "*,*::before,*::after{box-sizing:border-box}",
  "body{margin:0}",
]);

interface SnippetRequest {
  readonly capture: Capture;
  readonly entries: readonly CompiledTokenEntry[];
  readonly local: ReadonlyMap<string, string>;
  readonly pins: Readonly<Record<string, string>>;
  readonly seed: string;
}

interface Snippet {
  readonly source: string;
  readonly tokens: readonly { name: string; value: string | null }[];
}

const toPrefix = (seed: string): string =>
  `pc${createHash("sha256").update(seed).digest("hex").slice(0, PREFIX_CHARS)}`;

const toFallbacks = (
  rule: string,
  values: ReadonlyMap<string, string>
): string =>
  rule.replaceAll(VAR_USE, (whole, name: string) => {
    const value = values.get(name) ?? null;

    if (value === null) {
      return whole;
    }

    return `var(${name}, ${value})`;
  });

const toScopedSheet = (
  sheet: ClassSheet,
  prefix: string,
  values: ReadonlyMap<string, string>
): ClassSheet => ({
  classOf: new Map(
    [...sheet.classOf].map(([node, name]) => [node, `${prefix}-${name}`])
  ),
  rules: sheet.rules.map((rule) =>
    toFallbacks(rule.replace(CLASS_RULE, `.${prefix}-$<name>{`), values)
  ),
  tokens: sheet.tokens,
});

const toPinnedSheet = (
  sheet: ClassSheet,
  root: CapturedNode,
  prefix: string,
  pins: Readonly<Record<string, string>>
): ClassSheet => {
  const own = sheet.classOf.get(root) ?? null;
  const name = `${prefix}-root`;

  const declared = sheet.rules.find(
    (rule) => own !== null && rule.startsWith(`.${own}{`)
  );

  const inner = (declared ?? "").replace(/^[^{]*\{/u, "").replace(/\}$/u, "");

  const pinned = Object.entries(pins)
    .flatMap(([key, value]) => {
      if (value === "") {
        return [];
      }

      return [`${key}:${value.replaceAll(UNSAFE_CSS, "")}`];
    })
    .join(";");

  return {
    classOf: new Map([...sheet.classOf, [root, name]]),
    rules: [
      ...sheet.rules,
      `.${name}{${[pinned, inner].filter(Boolean).join(";")}}`,
    ],
    tokens: sheet.tokens,
  };
};

const toTokenNames = (rules: readonly string[]): readonly string[] => [
  ...new Set(
    rules.flatMap((rule) =>
      [...rule.matchAll(TOKEN_USE)].map((match) => match.groups?.["name"] ?? "")
    )
  ),
];

const toCaptureSnippet = (request: SnippetRequest): Snippet | null => {
  const { root: rootNode } = request.capture.page;

  if (rootNode === null) {
    return null;
  }

  const values = new Map(
    request.entries.map((entry) => [entry.cssVar, entry.value])
  );

  const prefix = toPrefix(request.seed);

  const scoped = toPinnedSheet(
    toScopedSheet(buildClassSheet(rootNode, request.entries), prefix, values),
    rootNode,
    prefix,
    request.pins
  );

  const document = renderPage({
    isRegion: true,
    local: request.local,
    page: request.capture.page,
    root: rootNode,
    sheet: scoped,
    sourceUrl: request.capture.page.url,
  });

  const css = (STYLE_BLOCK.exec(document)?.groups?.["css"] ?? "")
    .split("\n")
    .filter((line) => !GLOBAL_LINES.has(line))
    .join("\n");

  const html = BODY_BLOCK.exec(document)?.groups?.["html"] ?? "";

  return {
    source: [STYLE_OPEN, css, STYLE_CLOSE, html].join("\n"),
    tokens: toTokenNames(scoped.rules).flatMap((name) => {
      if (name === "") {
        return [];
      }

      return [{ name, value: values.get(name) ?? null }];
    }),
  };
};

export { toCaptureSnippet };

export type { Snippet, SnippetRequest };
