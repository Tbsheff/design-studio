import path from "node:path";

import { loadTypeScript, planImports, seenImports } from "./deps.js";
import type { ImportNeed, Project } from "./deps.js";
import type { File, Statement } from "./engine/deps.js";
import type { MappedImport } from "./engine/index.js";

interface Splice {
  readonly end: number;
  readonly start: number;
  readonly text: string;
}

interface ImportEdits {
  readonly added: readonly string[];
  readonly splices: readonly Splice[];
}

interface ImportInput {
  readonly ast: File;
  readonly code: string;
  readonly helpers: readonly string[];
  readonly isPlanned: boolean;
  readonly library: {
    readonly root: string;
    readonly specifiers: Map<string, string[]>;
  };
  readonly mapped: readonly MappedImport[];
  readonly project: Project;
  readonly targetFile: string;
}

const toDeclared = (statement: Statement): Statement => {
  if (
    (statement.type === "ExportNamedDeclaration" ||
      statement.type === "ExportDefaultDeclaration") &&
    statement.declaration
  ) {
    return statement.declaration as Statement;
  }

  return statement;
};

const toStatementNames = (statement: Statement): readonly string[] => {
  if (statement.type === "ImportDeclaration") {
    return statement.specifiers.map((specifier) => specifier.local.name);
  }

  const node = toDeclared(statement);

  if (
    (node.type === "FunctionDeclaration" || node.type === "ClassDeclaration") &&
    node.id
  ) {
    return [node.id.name];
  }

  if (node.type === "VariableDeclaration") {
    return node.declarations.flatMap((declarator) => {
      if (declarator.id.type === "Identifier") {
        return [declarator.id.name];
      }

      return [];
    });
  }

  return [];
};

const toBoundNames = (ast: File): ReadonlySet<string> =>
  new Set(ast.program.body.flatMap((statement) => toStatementNames(statement)));

const toSpecifier = (item: MappedImport, targetFile: string): string => {
  const { specifier } = item.pattern;

  if (item.origin === null || !specifier.startsWith(".")) {
    return specifier;
  }

  const relative = path
    .relative(path.dirname(targetFile), path.resolve(item.origin, specifier))
    .split(path.sep)
    .join("/");

  if (relative.startsWith(".")) {
    return relative;
  }

  return `./${relative}`;
};

const toImportLines = (
  items: readonly MappedImport[],
  targetFile: string
): readonly string[] => {
  const named = new Map<string, string[]>();
  const defaults: string[] = [];

  for (const item of items) {
    const specifier = toSpecifier(item, targetFile);

    if (item.pattern.isDefault) {
      defaults.push(`import ${item.name} from "${specifier}";`);
    } else {
      named.set(specifier, [...(named.get(specifier) ?? []), item.name]);
    }
  }

  const grouped = [...named].map(
    ([specifier, names]) =>
      `import { ${names.join(", ")} } from "${specifier}";`
  );

  return [...defaults, ...grouped];
};

const toPackageSplice = (
  ast: File,
  lines: readonly string[],
  tail: string
): Splice | null => {
  if (lines.length === 0 && tail === "") {
    return null;
  }

  const block = [...lines, tail].filter((part) => part !== "").join("\n");

  const imports = ast.program.body.filter(
    (statement) => statement.type === "ImportDeclaration"
  );

  const last = imports.at(-1)?.end ?? null;

  if (last !== null) {
    return { end: last, start: last, text: `\n${block}` };
  }

  const directive = ast.program.directives.at(-1)?.end ?? null;

  if (directive !== null) {
    return { end: directive, start: directive, text: `\n${block}\n` };
  }

  return { end: 0, start: 0, text: `${block}\n` };
};

const HELPER_NAME =
  /^(?:async\s+)?(?:function\s+|const\s+|let\s+)(?<name>[\w$]+)/u;

const toHelperTail = (
  helpers: readonly string[],
  bound: ReadonlySet<string>
): string => {
  const fresh = helpers.filter((text) => {
    const name = HELPER_NAME.exec(text)?.groups?.name ?? null;

    return name === null || !bound.has(name);
  });

  if (fresh.length === 0) {
    return "";
  }

  return `\n${fresh.join("\n\n")}\n`;
};

const toLibraryNeeds = (
  input: ImportInput,
  bound: ReadonlySet<string>
): ImportNeed[] =>
  input.mapped.flatMap((item): ImportNeed[] => {
    const { entry } = item;

    if (entry === null || bound.has(item.name)) {
      return [];
    }

    return [
      {
        allowPaths: input.project.app?.framework === "next",
        componentFile: entry.absolute,
        kind: entry.kind,
        name: item.name,
        planned: input.isPlanned,
        root: input.library.root,
        seen: seenImports(input.library.specifiers),
        targetFile: input.targetFile,
      },
    ];
  });

const getPatternImports = async (input: ImportInput): Promise<ImportEdits> => {
  const bound = toBoundNames(input.ast);
  const typescript = await loadTypeScript();

  const plan = planImports(
    typescript,
    input.code,
    input.ast,
    toLibraryNeeds(input, bound)
  );

  const packages = input.mapped.filter(
    (item) => item.entry === null && !bound.has(item.name)
  );

  const extra = toPackageSplice(
    input.ast,
    toImportLines(packages, input.targetFile),
    toHelperTail(input.helpers, bound)
  );

  const splices = [...plan.splices];

  if (extra !== null) {
    splices.push(extra);
  }

  const libraryAdded = plan.items.flatMap((item) => {
    if (item.added) {
      return [item.name];
    }

    return [];
  });

  return {
    added: [...libraryAdded, ...packages.map((item) => item.name)],
    splices,
  };
};

export { getPatternImports, toBoundNames };

export type { ImportEdits, ImportInput };
