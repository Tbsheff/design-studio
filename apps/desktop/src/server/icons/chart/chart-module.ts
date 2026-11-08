import { parseModuleFile } from "../../components/index.js";
import { ChartRequestError } from "./chart-request-error.js";

type ParsedModule = NonNullable<ReturnType<typeof parseModuleFile>>;

interface Splice {
  readonly end: number;
  readonly start: number;
  readonly text: string;
}

interface Edited {
  readonly code: string;
  readonly offset: number;
}

interface TopLevel {
  readonly declarations: readonly string[];
  readonly imports: readonly string[];
}

const DIRECTIVE = "use client";

const SERVER_ONLY =
  /\basync\s+function\b|\bawait\b|\bmetadata\b|server-only|"use server"/u;

const NAME_TRIES = 9;

const RECHARTS = "recharts";

const toSplicedAt = (edited: Edited, splices: readonly Splice[]): Edited => {
  const ordered = splices.toSorted((left, right) => right.start - left.start);
  let { code, offset } = edited;

  for (const splice of ordered) {
    code = code.slice(0, splice.start) + splice.text + code.slice(splice.end);

    if (splice.start <= offset) {
      offset += splice.text.length - (splice.end - splice.start);
    }
  }

  return { code, offset };
};

const toFreeName = (code: string, base: string): string => {
  const names = [
    base,
    ...Array.from(
      { length: NAME_TRIES },
      (_unused, index) => `${base}${index + 2}`
    ),
  ];

  return (
    names.find((name) => !new RegExp(`\\b${name}\\b`, "u").test(code)) ??
    `${base}Extra`
  );
};

const toAst = (code: string, file: string): ParsedModule => {
  const ast = parseModuleFile(code, file);

  if (!ast) {
    throw new ChartRequestError(
      "The file could not be parsed, so the chart was not added."
    );
  }

  return ast;
};

const hasClientDirective = (ast: ParsedModule): boolean =>
  ast.program.directives.some((item) => item.value.value === DIRECTIVE);

const isServerOnly = (code: string): boolean => SERVER_ONLY.test(code);

const toBoundNames = (ast: ParsedModule): Map<string, string> => {
  const bound = new Map<string, string>();

  const imports = ast.program.body.filter(
    (item) => item.type === "ImportDeclaration"
  );

  for (const statement of imports) {
    for (const specifier of statement.specifiers) {
      bound.set(specifier.local.name, statement.source.value);
    }
  }

  return bound;
};

const isDeclaredHere = (code: string, name: string): boolean =>
  new RegExp(`\\b(?:const|function|class)\\s+${name}\\b`, "u").test(code);

const toWantedNames = (
  code: string,
  ast: ParsedModule,
  names: readonly string[]
): string[] => {
  const bound = toBoundNames(ast);

  return names.filter((name) => {
    if (bound.get(name) === RECHARTS) {
      return false;
    }

    if (bound.has(name) || isDeclaredHere(code, name)) {
      throw new ChartRequestError(
        `The file already has its own ${name}, so the chart cannot import it from recharts.`
      );
    }

    return true;
  });
};

const toRechartsExtend = (
  ast: ParsedModule,
  wanted: readonly string[]
): Splice | null => {
  const existing = ast.program.body.find(
    (item) =>
      item.type === "ImportDeclaration" &&
      item.source.value === RECHARTS &&
      item.importKind !== "type"
  );

  if (existing?.type !== "ImportDeclaration") {
    return null;
  }

  const named = existing.specifiers.filter(
    (item) => item.type === "ImportSpecifier"
  );

  const end = named.at(-1)?.end ?? null;

  if (end === null) {
    return null;
  }

  return { end, start: end, text: `, ${wanted.join(", ")}` };
};

const toTopOffset = (ast: ParsedModule): number => {
  const lastImport = ast.program.body.findLast(
    (item) => item.type === "ImportDeclaration"
  );

  return lastImport?.end ?? ast.program.directives.at(-1)?.end ?? -1;
};

const toTopSplice = (ast: ParsedModule, lines: readonly string[]): Splice[] => {
  if (lines.length === 0) {
    return [];
  }

  const at = toTopOffset(ast);
  const text = lines.join("\n\n");

  if (at === -1) {
    return [{ end: 0, start: 0, text: `${text}\n\n` }];
  }

  return [{ end: at, start: at, text: `\n\n${text}` }];
};

const toDeclared = (code: string, file: string, top: TopLevel): Splice[] => {
  const ast = toAst(code, file);
  const wanted = toWantedNames(code, ast, top.imports);
  const extend = toRechartsExtend(ast, wanted);
  const lines: string[] = [];
  const splices: Splice[] = [];

  if (wanted.length > 0 && extend === null) {
    lines.push(`import { ${wanted.join(", ")} } from "${RECHARTS}";`);
  }

  if (extend !== null) {
    splices.push(extend);
  }

  const joined = [lines.join("\n"), ...top.declarations].filter(
    (item) => item !== ""
  );

  return [...splices, ...toTopSplice(ast, joined)];
};

const toDirectiveSplice = (): Splice => ({
  end: 0,
  start: 0,
  text: `"${DIRECTIVE}";\n\n`,
});

export {
  hasClientDirective,
  isServerOnly,
  toAst,
  toDeclared,
  toDirectiveSplice,
  toFreeName,
  toSplicedAt,
};

export type { Edited, ParsedModule, Splice };
