import { parseModuleFile } from "./deps.js";
import { IconError } from "./set.js";

type ModuleAst = NonNullable<ReturnType<typeof parseModuleFile>>;

type Statement = ModuleAst["program"]["body"][number];

type ImportDecl = Extract<Statement, { type: "ImportDeclaration" }>;

type ImportItem = ImportDecl["specifiers"][number];

type NamedItem = Extract<ImportItem, { type: "ImportSpecifier" }>;

interface Splice {
  end: number;
  start: number;
  text: string;
}

interface ImportEdit {
  added: boolean;
  splice: Splice | null;
}

interface ImportNeed {
  component: string;
  file: string;
  from: string;
}

const isImport = (node: Statement): node is ImportDecl =>
  node.type === "ImportDeclaration";

const isNamed = (item: ImportItem): item is NamedItem =>
  item.type === "ImportSpecifier";

const quoteOf = (decls: readonly ImportDecl[], code: string): string => {
  const at = decls[0]?.source.start ?? -1;

  if (code[at] === "'") {
    return "'";
  }

  return '"';
};

const insertAt = (at: number, text: string): Splice => ({
  end: at,
  start: at,
  text,
});

const extendSplice = (decl: ImportDecl, name: string): Splice | null => {
  if (decl.importKind === "type") {
    return null;
  }

  const last = decl.specifiers.findLast(isNamed);

  if (last) {
    return insertAt(last.end ?? 0, `, ${name}`);
  }

  const [only] = decl.specifiers;

  if (decl.specifiers.length === 1 && only?.type === "ImportDefaultSpecifier") {
    return insertAt(only.end ?? 0, `, { ${name} }`);
  }

  return null;
};

const newLine = (ast: ModuleAst, code: string, need: ImportNeed): Splice => {
  const decls = ast.program.body.filter(isImport);
  const quote = quoteOf(decls, code);
  const line = `import { ${need.component} } from ${quote}${need.from}${quote};`;
  const after = decls.at(-1)?.end ?? ast.program.directives.at(-1)?.end ?? 0;

  if (after === 0) {
    return insertAt(0, `${line}\n`);
  }

  return insertAt(after, `\n${line}`);
};

const iconImport = (code: string, need: ImportNeed): ImportEdit => {
  const ast = parseModuleFile(code, need.file);

  if (!ast) {
    throw new IconError(`${need.file} could not be parsed`);
  }

  const decls = ast.program.body.filter(isImport);

  const bound = decls.some((decl) =>
    decl.specifiers.some((item) => item.local.name === need.component)
  );

  if (bound) {
    return { added: false, splice: null };
  }

  for (const decl of decls) {
    const splice =
      decl.source.value === need.from && extendSplice(decl, need.component);

    if (splice) {
      return { added: true, splice };
    }
  }

  return { added: true, splice: newLine(ast, code, need) };
};

const applySplice = (code: string, splice: Splice): string =>
  code.slice(0, splice.start) + splice.text + code.slice(splice.end);

export { applySplice, iconImport };

export type { ImportEdit, Splice };
