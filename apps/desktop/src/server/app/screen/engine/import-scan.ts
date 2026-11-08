interface ImportName {
  readonly imported: string;
  readonly local: string;
}

interface ImportClause {
  readonly defaultName: string | null;
  readonly names: readonly ImportName[];
  readonly source: string;
}

const IMPORT_PATTERN =
  /\bimport\b(?<clause>[^;'"]*)\bfrom\s*["'](?<source>[^"'\n]+)["']/gu;

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/u;

const toImportNames = (braces: string): readonly ImportName[] =>
  braces.split(",").flatMap((part) => {
    const trimmed = part.trim();

    if (trimmed === "" || trimmed.startsWith("type ")) {
      return [];
    }

    const [imported = trimmed, local = imported] = trimmed.split(" as ");

    return [{ imported, local }];
  });

const toDefaultName = (head: string): string | null => {
  const name = head.replaceAll(",", "").trim();

  if (IDENTIFIER.test(name)) {
    return name;
  }

  return null;
};

const toImportClause = (clause: string, source: string): ImportClause => {
  const open = clause.indexOf("{");
  const close = clause.indexOf("}");
  let names: readonly ImportName[] = [];
  let head = clause;

  if (open !== -1 && close > open) {
    names = toImportNames(clause.slice(open + 1, close));
    head = clause.slice(0, open);
  }

  return { defaultName: toDefaultName(head), names, source };
};

const toImportClauses = (code: string): readonly ImportClause[] =>
  [...code.matchAll(IMPORT_PATTERN)].flatMap((match) => {
    const clause = match.groups?.clause?.trim() ?? "";
    const source = match.groups?.source ?? "";

    if (clause.startsWith("type ")) {
      return [];
    }

    return [toImportClause(clause, source)];
  });

const toClauseOf = (
  clauses: readonly ImportClause[],
  local: string
): ImportClause | null =>
  clauses.find(
    (clause) =>
      clause.defaultName === local ||
      clause.names.some((name) => name.local === local)
  ) ?? null;

const toImportLine = (
  clause: ImportClause,
  local: string,
  source: string
): string => {
  if (clause.defaultName === local) {
    return `import ${local} from "${source}";`;
  }

  const found = clause.names.find((name) => name.local === local);
  const imported = found?.imported ?? local;

  if (imported === local) {
    return `import { ${local} } from "${source}";`;
  }

  return `import { ${imported} as ${local} } from "${source}";`;
};

export { toClauseOf, toImportClauses, toImportLine };

export type { ImportClause, ImportName };
