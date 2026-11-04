import path from "node:path";

import type {
  File as BabelFile,
  ImportDeclaration,
  ImportSpecifier,
  JSXElement,
  Node as BabelNode,
} from "@babel/types";

import {
  followExport,
  insideRoot,
  loadTypeScript,
  parseModuleFile,
  resolveImport,
} from "./deps.js";
import type { ComponentRef } from "./deps.js";
import { listNodes, toTagName } from "./engine/index.js";
import { getSourceText, listSourceFiles } from "./prop-files.js";
import type { PropTarget } from "./prop-target.js";

type Ts = Parameters<typeof resolveImport>[0];

interface SiteFile {
  readonly ast: BabelFile;
  readonly code: string;
  readonly elements: readonly JSXElement[];
  readonly file: string;
  readonly relative: string;
  readonly strays: number;
}

interface SiteScope {
  readonly matches: Map<string, Promise<boolean>>;
  readonly resolved: Map<string, Promise<string | null>>;
  readonly root: string;
  readonly target: PropTarget;
  readonly ts: Ts;
}

interface Bindings {
  readonly locals: ReadonlySet<string>;
  readonly spaces: ReadonlyMap<string, string>;
}

interface Candidate {
  readonly file: string;
  readonly isSpace: boolean;
  readonly local: string;
  readonly name: string;
}

const WORKERS = 12;

const toImportedName = (specifier: ImportSpecifier): string => {
  if (specifier.imported.type === "Identifier") {
    return specifier.imported.name;
  }

  return specifier.imported.value;
};

const runResolve = async (
  scope: SiteScope,
  specifier: string,
  from: string
): Promise<string | null> => {
  const found = resolveImport(scope.ts, specifier, from, scope.root);

  if (found === null) {
    return null;
  }

  return await insideRoot(scope.root, found);
};

const toResolved = (
  scope: SiteScope,
  specifier: string,
  from: string
): Promise<string | null> => {
  const key = `${path.dirname(from)}\0${specifier}`;
  const known = scope.resolved.get(key);

  if (known) {
    return known;
  }

  const task = runResolve(scope, specifier, from);

  scope.resolved.set(key, task);

  return task;
};

const isTarget = (scope: SiteScope, ref: ComponentRef | null): boolean =>
  ref !== null &&
  ref.file === scope.target.file &&
  ref.name === scope.target.model.name;

const runMatch = async (
  scope: SiteScope,
  file: string,
  name: string
): Promise<boolean> => {
  const ref = await followExport(scope.ts, scope.root, { file, name });

  return isTarget(scope, ref);
};

const toMatches = (
  scope: SiteScope,
  file: string,
  name: string
): Promise<boolean> => {
  const key = `${file}\0${name}`;
  const known = scope.matches.get(key);

  if (known) {
    return known;
  }

  const task = runMatch(scope, file, name);

  scope.matches.set(key, task);

  return task;
};

const toCandidate = (
  specifier: ImportDeclaration["specifiers"][number],
  file: string
): Candidate => {
  const local = specifier.local.name;

  if (specifier.type === "ImportNamespaceSpecifier") {
    const isSpace = true;
    const name = "*";

    return { file, isSpace, local, name };
  }

  const isSpace = false;
  let name = "default";

  if (specifier.type === "ImportSpecifier") {
    name = toImportedName(specifier);
  }

  return { file, isSpace, local, name };
};

const toDeclarationCandidates = async (
  scope: SiteScope,
  statement: ImportDeclaration,
  file: string
): Promise<Candidate[]> => {
  const resolved = await toResolved(scope, statement.source.value, file);

  if (resolved === null) {
    return [];
  }

  return statement.specifiers.map((specifier) =>
    toCandidate(specifier, resolved)
  );
};

const toLocalHit = async (
  scope: SiteScope,
  candidate: Candidate
): Promise<string | null> => {
  if (await toMatches(scope, candidate.file, candidate.name)) {
    return candidate.local;
  }

  return null;
};

const toBindings = async (
  scope: SiteScope,
  ast: BabelFile,
  file: string
): Promise<Bindings> => {
  const imports = ast.program.body.filter(
    (statement): statement is ImportDeclaration =>
      statement.type === "ImportDeclaration"
  );

  const lists = await Promise.all(
    imports.map((statement) => toDeclarationCandidates(scope, statement, file))
  );

  const candidates = lists.flat();
  const plain = candidates.filter((candidate) => !candidate.isSpace);

  const hits = await Promise.all(
    plain.map((candidate) => toLocalHit(scope, candidate))
  );

  const locals = new Set(hits.filter((hit): hit is string => hit !== null));

  if (file === scope.target.file) {
    locals.add(scope.target.model.name);
  }

  const spaces = new Map<string, string>();

  for (const candidate of candidates) {
    if (candidate.isSpace) {
      spaces.set(candidate.local, candidate.file);
    }
  }

  return { locals, spaces };
};

const toElementHit = async (
  scope: SiteScope,
  bindings: Bindings,
  element: JSXElement
): Promise<JSXElement | null> => {
  const tag = toTagName(element.openingElement.name);
  const [head = "", member = ""] = tag.split(".");
  const space = bindings.spaces.get(head);

  if (bindings.locals.has(tag)) {
    return element;
  }

  if (space && member !== "" && (await toMatches(scope, space, member))) {
    return element;
  }

  return null;
};

const toElements = async (
  scope: SiteScope,
  ast: BabelFile,
  bindings: Bindings
): Promise<JSXElement[]> => {
  const all = listNodes(ast.program, (node) => {
    if (node.type === "JSXElement") {
      return node;
    }

    return null;
  });

  const hits = await Promise.all(
    all.map((element) => toElementHit(scope, bindings, element))
  );

  return hits.filter((hit): hit is JSXElement => hit !== null);
};

const isStray = (
  node: BabelNode,
  parent: BabelNode | null,
  locals: ReadonlySet<string>
): boolean => {
  if (node.type !== "Identifier" || !locals.has(node.name)) {
    return false;
  }

  return !(
    parent?.type === "MemberExpression" &&
    parent.property === node &&
    !parent.computed
  );
};

const toStrayCount = (
  statement: BabelNode,
  locals: ReadonlySet<string>
): number =>
  listNodes(statement, (node, parent) => {
    if (isStray(node, parent, locals)) {
      return node;
    }

    return null;
  }).length;

const toStrays = (ast: BabelFile, locals: ReadonlySet<string>): number => {
  const statements = ast.program.body.filter(
    (statement) => statement.type !== "ImportDeclaration"
  );

  let total = 0;

  for (const statement of statements) {
    total += toStrayCount(statement, locals);
  }

  return total;
};

const isCandidate = (code: string, target: PropTarget): boolean => {
  if (!code.includes("<")) {
    return false;
  }

  return (
    code.includes(target.model.name) ||
    code.includes(target.exportName) ||
    target.exportName === "default"
  );
};

const getSiteFile = async (
  scope: SiteScope,
  file: string
): Promise<SiteFile | null> => {
  const code = await getSourceText(file);
  const { target } = scope;

  if (code === null || !isCandidate(code, target)) {
    return null;
  }

  const ast = parseModuleFile(code, file);

  if (!ast) {
    return null;
  }

  const bindings = await toBindings(scope, ast, file);
  const elements = await toElements(scope, ast, bindings);
  let strays = 0;

  if (file !== target.file) {
    strays = toStrays(ast, bindings.locals);
  }

  if (elements.length === 0 && strays === 0) {
    return null;
  }

  const relative = path.relative(scope.root, file);

  return { ast, code, elements, file, relative, strays };
};

interface Queue {
  next: number;
}

const runQueue = async (
  queue: Queue,
  files: readonly string[],
  scope: SiteScope,
  out: SiteFile[]
): Promise<void> => {
  const file = files.at(queue.next) ?? null;

  queue.next += 1;

  if (file === null) {
    return;
  }

  const site = await getSiteFile(scope, file);

  if (site !== null) {
    out.push(site);
  }

  await runQueue(queue, files, scope, out);
};

const listSites = async (target: PropTarget): Promise<SiteFile[]> => {
  const ts = await loadTypeScript();
  const { root } = target;
  const matches = new Map<string, Promise<boolean>>();
  const resolved = new Map<string, Promise<string | null>>();
  const scope: SiteScope = { matches, resolved, root, target, ts };
  const files = await listSourceFiles(root);
  const out: SiteFile[] = [];
  const queue: Queue = { next: 0 };

  await Promise.all(
    Array.from({ length: WORKERS }, () => runQueue(queue, files, scope, out))
  );

  return out.toSorted((left, right) => left.file.localeCompare(right.file));
};

export { listSites };

export type { SiteFile };
