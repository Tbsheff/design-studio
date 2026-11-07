import { readFile } from "node:fs/promises";

import {
  indentUnit,
  loadLibrary,
  normalize,
  parseHtmlSnippet,
  parseModuleFile,
  planInsert,
  positionAt,
  refuse,
  resolveSource,
  resolveTarget,
  structureDoc,
} from "./deps.js";
import type {
  DocNode,
  InsertScope,
  NodeRole,
  Placement,
  SourceLoc,
} from "./deps.js";
import { getPatternImports } from "./pattern-imports.js";
import type { ImportEdits } from "./pattern-imports.js";
import type { InsertPosition, StoredPattern } from "./pattern-model.js";
import { toUnresolved } from "./pattern-plan.js";
import type { PatternPlan } from "./pattern-plan.js";
import type { Prepared } from "./pattern-prepare.js";
import { toNode } from "./pattern-text.js";

interface LayerCommand {
  readonly position: InsertPosition;
  readonly source: SourceLoc;
  readonly tag: string | null;
}

interface InsertTargetRequest {
  readonly target: { readonly source: SourceLoc; readonly tag?: string };
}

const ROLE: Readonly<Record<InsertPosition, NodeRole>> = {
  after: "insert",
  before: "insert",
  inside: "into",
  replace: "insert",
};

const VOID_TAGS: ReadonlySet<string> = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "select",
  "source",
  "textarea",
  "track",
  "wbr",
]);

const HTML_FILE = /\.html?$/iu;

const toPlacement = (position: InsertPosition, node: DocNode): Placement => {
  if (position === "inside") {
    return { into: node };
  }

  if (position === "before") {
    return { before: node };
  }

  if (position === "after") {
    return { after: node };
  }

  return { replace: node };
};

const toTitle = (
  name: string,
  position: InsertPosition,
  tag: string
): string => {
  if (position === "inside") {
    return `Insert pattern ${name} into ${tag}`;
  }

  if (position === "replace") {
    return `Replace ${tag} with pattern ${name}`;
  }

  return `Insert pattern ${name} ${position} ${tag}`;
};

const toRequest = (
  source: SourceLoc,
  tag: string | null
): InsertTargetRequest => {
  if (tag === null) {
    return { target: { source } };
  }

  return { target: { source, tag } };
};

const runHoldCheck = (position: InsertPosition, node: DocNode): void => {
  if (node.branch) {
    throw refuse(
      `<${node.tag}> is one branch of a condition. Pick the element around it.`
    );
  }

  if (position === "inside" && VOID_TAGS.has(node.tag)) {
    throw refuse(
      `<${node.tag}> cannot hold other elements; insert after it instead`
    );
  }
};

const insertReactLayer = async (
  scope: InsertScope,
  stored: StoredPattern,
  prepared: Prepared,
  command: LayerCommand
): Promise<PatternPlan> => {
  const kit = await loadLibrary(scope.project, scope.workTree);

  const resolved = await resolveTarget(
    scope,
    kit.root,
    toRequest(command.source, command.tag),
    kit.entries
  );

  const doc = structureDoc(resolved.target.relative, resolved.code);
  const node = doc.node(resolved.at, ROLE[command.position], resolved.tag);
  runHoldCheck(command.position, node);

  const module = parseModuleFile(resolved.code, resolved.target.file);
  let edits: ImportEdits = { added: [], splices: [] };

  if (module !== null) {
    edits = await getPatternImports({
      ast: module,
      code: resolved.code,
      helpers: prepared.helpers,
      isPlanned: false,
      library: kit,
      mapped: prepared.mapping.mapped,
      project: scope.project,
      targetFile: resolved.target.file,
    });
  }

  const plan = planInsert(resolved.code, {
    closeTag: (target) => doc.closeTag(target),
    extras: [...edits.splices],
    pieces: [normalize(prepared.text, "", indentUnit(resolved.code))],
    place: toPlacement(command.position, node),
  });

  doc.verify(
    plan.code,
    plan.select.map((offset) => positionAt(plan.code, offset))
  );

  return {
    addedImports: edits.added,
    code: plan.code,
    isNew: false,
    original: resolved.code,
    route: null,
    target: resolved.target,
    title: toTitle(stored.name, command.position, node.tag),
    unresolved: toUnresolved(stored.references, resolved.code),
  };
};

const insertHtmlLayer = async (
  scope: InsertScope,
  stored: StoredPattern,
  prepared: Prepared,
  command: LayerCommand
): Promise<PatternPlan> => {
  const file = await resolveSource(scope.workTree, command.source.file);

  if (!HTML_FILE.test(file.relative)) {
    throw refuse(`${file.relative} is not an HTML file`);
  }

  const code = await readFile(file.file, "utf-8");
  const doc = structureDoc(file.relative, code);

  const node = toNode(doc, command.source, ROLE[command.position], command.tag);

  runHoldCheck(command.position, node);
  const snippet = parseHtmlSnippet(prepared.text, indentUnit(code));

  const plan = planInsert(code, {
    closeTag: (found) => doc.closeTag(found),
    pieces: snippet.pieces,
    place: toPlacement(command.position, node),
  });

  doc.verify(
    plan.code,
    plan.select.map((offset) => positionAt(plan.code, offset))
  );

  return {
    addedImports: [],
    code: plan.code,
    isNew: false,
    original: code,
    route: null,
    target: file,
    title: toTitle(stored.name, command.position, node.tag),
    unresolved: [],
  };
};

export { insertHtmlLayer, insertReactLayer };

export type { LayerCommand };
