import { toReferencedNames } from "./ast-walk.js";
import type { File, ImportDeclaration, ImportSpecifier } from "./deps.js";
import type { Splice } from "./jsx-unwrap.js";
import { toMovedSpecifier } from "./route-path.js";

interface TidyCommand {
  readonly after: File;
  readonly afterCode: string;
  readonly before: File;
  readonly fromDir: string;
  readonly toDir: string;
}

const toBodyRefs = (ast: File): ReadonlySet<string> =>
  toReferencedNames(
    ast.program.body.filter(
      (statement) => statement.type !== "ImportDeclaration"
    ),
    () => false
  );

const toImportedName = (specifier: ImportSpecifier): string => {
  if (specifier.imported.type === "Identifier") {
    return specifier.imported.name;
  }

  return specifier.imported.value;
};

const toTypePrefix = (isType: boolean): string => {
  if (isType) {
    return "type ";
  }

  return "";
};

const toSpecifierText = (
  specifier: ImportDeclaration["specifiers"][number]
): string => {
  if (specifier.type === "ImportDefaultSpecifier") {
    return specifier.local.name;
  }

  if (specifier.type === "ImportNamespaceSpecifier") {
    return `* as ${specifier.local.name}`;
  }

  const imported = toImportedName(specifier);
  const prefix = toTypePrefix(specifier.importKind === "type");

  if (imported === specifier.local.name) {
    return `${prefix}${imported}`;
  }

  return `${prefix}${imported} as ${specifier.local.name}`;
};

const toImportText = (
  declaration: ImportDeclaration,
  kept: ImportDeclaration["specifiers"],
  source: string
): string => {
  const defaults = kept.filter(
    (item) => item.type === "ImportDefaultSpecifier"
  );

  const namespaces = kept.filter(
    (item) => item.type === "ImportNamespaceSpecifier"
  );

  const named = kept.filter((item) => item.type === "ImportSpecifier");

  const parts = [...defaults, ...namespaces].map((item) =>
    toSpecifierText(item)
  );

  if (named.length > 0) {
    parts.push(`{ ${named.map((item) => toSpecifierText(item)).join(", ")} }`);
  }

  const kind = toTypePrefix(declaration.importKind === "type");

  return `import ${kind}${parts.join(", ")} from ${source};`;
};

const toQuote = (code: string, node: ImportDeclaration): string =>
  code.charAt(node.source.start ?? 0);

const toImportSplice = (
  command: TidyCommand,
  declaration: ImportDeclaration,
  beforeRefs: ReadonlySet<string>,
  afterRefs: ReadonlySet<string>
): readonly Splice[] => {
  const quote = toQuote(command.afterCode, declaration);

  const kept = declaration.specifiers.filter(
    (specifier) =>
      afterRefs.has(specifier.local.name) ||
      !beforeRefs.has(specifier.local.name)
  );

  const moved = toMovedSpecifier(
    declaration.source.value,
    command.fromDir,
    command.toDir
  );

  const source = `${quote}${moved}${quote}`;
  const start = declaration.start ?? 0;
  const end = declaration.end ?? 0;

  if (declaration.specifiers.length > 0 && kept.length === 0) {
    let stop = end;

    if (command.afterCode[stop] === "\n") {
      stop += 1;
    }

    return [{ end: stop, start: declaration.start ?? 0, text: "" }];
  }

  if (kept.length !== declaration.specifiers.length) {
    return [{ end, start, text: toImportText(declaration, kept, source) }];
  }

  if (moved !== declaration.source.value) {
    return [
      {
        end: declaration.source.end ?? 0,
        start: declaration.source.start ?? 0,
        text: source,
      },
    ];
  }

  return [];
};

const toTidiedSource = (command: TidyCommand): string => {
  const beforeRefs = toBodyRefs(command.before);
  const afterRefs = toBodyRefs(command.after);

  const splices = command.after.program.body.flatMap((statement) => {
    if (statement.type !== "ImportDeclaration") {
      return [];
    }

    return toImportSplice(command, statement, beforeRefs, afterRefs);
  });

  const ordered = splices.toSorted((left, right) => right.start - left.start);
  let output = command.afterCode;

  for (const splice of ordered) {
    output =
      output.slice(0, splice.start) + splice.text + output.slice(splice.end);
  }

  return output;
};

export { toTidiedSource };

export type { TidyCommand };
