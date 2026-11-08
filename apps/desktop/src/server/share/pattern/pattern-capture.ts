import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  BadRequestError,
  loadLibrary,
  parseModuleFile,
  resolveSource,
  structureDoc,
} from "./deps.js";
import type { Direction, LibraryEntry, Project, SourceLoc } from "./deps.js";
import type { File, Statement } from "./engine/deps.js";
import { inspectSnippet, toTokenNames } from "./engine/index.js";
import type { PatternImport, TokenValue } from "./engine/index.js";
import type { StoredPattern } from "./pattern-model.js";
import { toDedented, toNode, toPatternId, toTags } from "./pattern-text.js";
import { getProjectTokens } from "./pattern-tokens.js";
import { toFragment, toWrapped } from "./snippet-parse.js";

interface CaptureScope {
  readonly direction: Direction;
  readonly project: Project;
  readonly workTree: string;
}

interface CaptureCommand {
  readonly name: string;
  readonly source: SourceLoc;
  readonly tag: string | null;
  readonly tags: readonly string[];
  readonly thumbnail: string | null;
}

interface ModuleImport {
  readonly isDefault: boolean;
  readonly specifier: string;
}

interface ReactParts {
  readonly helpers: readonly string[];
  readonly imports: readonly PatternImport[];
  readonly isClient: boolean;
  readonly references: readonly string[];
}

const HTML_FILE = /\.html?$/iu;

const PLAIN_SCRIPT = /\.(?:jsx?|mjs)$/iu;

const SOURCE_SUFFIX = /\.(?:tsx?|jsx?|mjs|mts)$/u;

const INDEX_SUFFIX = /\/index$/u;

const SOURCE_MAX = 60_000;

const TAIL_SEGMENTS = 2;

const toModuleImports = (
  ast: File | null
): ReadonlyMap<string, ModuleImport> => {
  const found = new Map<string, ModuleImport>();

  if (ast === null) {
    return found;
  }

  for (const statement of ast.program.body) {
    if (
      statement.type === "ImportDeclaration" &&
      statement.importKind !== "type"
    ) {
      for (const specifier of statement.specifiers) {
        found.set(specifier.local.name, {
          isDefault: specifier.type === "ImportDefaultSpecifier",
          specifier: statement.source.value,
        });
      }
    }
  }

  return found;
};

const toStripped = (file: string): string =>
  file.replace(SOURCE_SUFFIX, "").replace(INDEX_SUFFIX, "");

const isLibraryMatch = (
  entry: LibraryEntry,
  item: ModuleImport,
  fromFile: string
): boolean => {
  const full = toStripped(entry.absolute);

  if (item.specifier.startsWith(".")) {
    return (
      full === toStripped(path.resolve(path.dirname(fromFile), item.specifier))
    );
  }

  const tail = item.specifier.split("/").slice(-TAIL_SEGMENTS).join("/");

  return full.endsWith(`/${tail}`);
};

const toLibraryFile = (
  entries: readonly LibraryEntry[],
  name: string,
  item: ModuleImport,
  fromFile: string
): string | null => {
  const found = entries.find(
    (entry) => entry.name === name && isLibraryMatch(entry, item, fromFile)
  );

  return found?.file ?? null;
};

const toTokenList = async (
  workTree: string,
  names: readonly string[]
): Promise<readonly TokenValue[]> => {
  if (names.length === 0) {
    return [];
  }

  const known = (await getProjectTokens(workTree)) ?? [];

  return names.map((name) => ({
    name,
    value: known.find((token) => token.name === name)?.value ?? null,
  }));
};

const toDeclaredNames = (statement: Statement): readonly string[] => {
  if (statement.type === "FunctionDeclaration" && statement.id) {
    return [statement.id.name];
  }

  if (statement.type === "VariableDeclaration") {
    return statement.declarations.flatMap((declarator) => {
      if (declarator.id.type === "Identifier") {
        return [declarator.id.name];
      }

      return [];
    });
  }

  return [];
};

interface Declared {
  readonly names: readonly string[];
  readonly text: string;
}

const isUsed = (text: string, name: string): boolean => {
  const escaped = name.replaceAll("$", String.raw`\$`);

  return new RegExp(String.raw`(?<![\w$.])${escaped}(?![\w$])`, "u").test(text);
};

const toDeclared = (ast: File, code: string): readonly Declared[] =>
  ast.program.body.flatMap((statement): Declared[] => {
    const names = toDeclaredNames(statement);
    const start = statement.start ?? null;

    if (names.length === 0 || start === null) {
      return [];
    }

    return [{ names, text: code.slice(start, statement.end ?? start) }];
  });

const toUsedNames = (
  declared: readonly Declared[],
  text: string
): readonly string[] => {
  const used: string[] = [];

  for (const other of declared) {
    for (const name of other.names) {
      if (isUsed(text, name)) {
        used.push(name);
      }
    }
  }

  return used;
};

const toNextHelper = (
  declared: readonly Declared[],
  chosen: ReadonlySet<Declared>,
  pending: ReadonlySet<string>
): Declared | null =>
  declared.find(
    (item) => !chosen.has(item) && item.names.some((name) => pending.has(name))
  ) ?? null;

const toHelpers = (
  ast: File | null,
  code: string,
  references: readonly string[]
): readonly Declared[] => {
  if (ast === null) {
    return [];
  }

  const declared = toDeclared(ast, code);
  const chosen = new Set<Declared>();
  const pending = new Set(references);
  let next = toNextHelper(declared, chosen, pending);

  while (next !== null) {
    chosen.add(next);

    for (const name of toUsedNames(declared, next.text)) {
      pending.add(name);
    }

    next = toNextHelper(declared, chosen, pending);
  }

  return declared.filter((item) => chosen.has(item));
};

const toReactParts = async (
  scope: CaptureScope,
  code: string,
  file: string,
  text: string
): Promise<ReactParts> => {
  const fragment = toFragment(toWrapped(text), !PLAIN_SCRIPT.test(file));

  if (fragment === null) {
    throw new BadRequestError(
      "The studio cannot read this layer as JSX, so it cannot save it as a pattern."
    );
  }

  const scan = inspectSnippet(fragment);
  const ast = parseModuleFile(code, file);
  const module = toModuleImports(ast);
  const library = await loadLibrary(scope.project, scope.workTree);

  const helpers = toHelpers(
    ast,
    code,
    scan.free.filter((name) => !module.has(name))
  );

  const helperText = helpers.map((item) => item.text).join("\n");
  const helperNames = new Set(helpers.flatMap((item) => item.names));

  const names = [
    ...scan.free,
    ...[...module.keys()].filter((name) => isUsed(helperText, name)),
  ];

  const found = [...new Set(names)].flatMap((local): PatternImport[] => {
    const item = module.get(local) ?? null;

    if (item === null) {
      return [];
    }

    return [
      {
        file: toLibraryFile(library.entries, local, item, file),
        isDefault: item.isDefault,
        name: local,
        specifier: item.specifier,
      },
    ];
  });

  return {
    helpers: helpers.map((item) => item.text),
    imports: found,
    isClient: scan.isClient,
    references: scan.free.filter(
      (name) => !module.has(name) && !helperNames.has(name)
    ),
  };
};

const toPatternKind = (isHtml: boolean): StoredPattern["kind"] => {
  if (isHtml) {
    return "html";
  }

  return "react";
};

const toParts = (
  scope: CaptureScope,
  isHtml: boolean,
  source: {
    readonly code: string;
    readonly file: string;
    readonly text: string;
  }
): Promise<ReactParts> => {
  if (isHtml) {
    return Promise.resolve({
      helpers: [],
      imports: [],
      isClient: false,
      references: [],
    });
  }

  return toReactParts(scope, source.code, source.file, source.text);
};

const createStoredPattern = async (
  scope: CaptureScope,
  command: CaptureCommand
): Promise<StoredPattern> => {
  const resolved = await resolveSource(scope.workTree, command.source.file);
  const code = await readFile(resolved.file, "utf-8");
  const doc = structureDoc(resolved.relative, code);
  const node = toNode(doc, command.source, "target", command.tag);
  const text = toDedented(code, node.start, node.end);

  if (text.length > SOURCE_MAX) {
    throw new BadRequestError(
      `This layer has ${text.length} characters of source. A pattern holds at most ${SOURCE_MAX}. Pick a smaller layer.`
    );
  }

  const isHtml = HTML_FILE.test(resolved.relative);

  const { file } = resolved;
  const parts = await toParts(scope, isHtml, { code, file, text });

  const patternKind = toPatternKind(isHtml);

  const list = await toTokenList(scope.workTree, toTokenNames(text));

  return {
    helpers: parts.helpers,
    id: toPatternId(command.name, text),
    importCount: parts.imports.length,
    imports: parts.imports,
    isClient: parts.isClient,
    kind: patternKind,
    name: command.name,
    references: parts.references,
    savedAt: new Date().toISOString(),
    source: text,
    sourceFile: resolved.relative,
    sourceName: scope.project.name,
    sourceProjectId: scope.project.id,
    tags: toTags(command.tags),
    thumbnail: command.thumbnail,
    tokenCount: list.length,
    tokens: list,
  };
};

export { createStoredPattern };

export type { CaptureCommand, CaptureScope };
