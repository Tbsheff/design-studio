import { readFile } from "node:fs/promises";

import type { Direction, VersionMeta } from "@design-studio/contracts";
import type { InsertTarget } from "@design-studio/contracts/insert";
import { Schema } from "effect";
import { parse, type DefaultTreeAdapterMap } from "parse5";

import {
  BOOLEAN_OPS,
  VECTOR_COLOR,
  VECTOR_PATH_MAX,
  VECTOR_SHAPES,
  type VectorPaint,
  type VectorRequest,
  type VectorResult,
} from "../../../shared/vector.js";
import type { DirectEditDeps, ResolvedSource } from "../../events/index.js";
import { toDecoder } from "../../platform/decode/index.js";
import type { InsertScope } from "../components-ops/insert.js";
import { DirectEditError } from "../engine/errors.js";
import { planBoolean } from "../engine/vector-boolean.js";
import { jsxAttrName } from "../engine/vector-snippet.js";
import { isHtmlFile, vectorDoc, type VNode } from "../engine/vector-source.js";
import {
  TargetSchema,
  toIssueText,
  toTrimmed,
} from "../request/request-fields.js";
import { writeAndCommitAll } from "./batch.js";
import { patchSource, resolveSource } from "./edit-source.js";
import { setHtmlAttrs, setJsxAttrs, type AttrChanges } from "./image-attrs.js";
import { planInsertJsx } from "./jsx-insert.js";
import { assertCanEdit, publishVersion } from "./publish.js";
import {
  toPaintWidth,
  toPlacedSnippet,
  type PlacedRequest,
} from "./vector-snippets.js";

type Element = DefaultTreeAdapterMap["element"];

export interface VectorPlan {
  target: ResolvedSource;
  original: string;
  code: string;
  select: VectorResult["select"];
  title: string;
}

const coord = Schema.Finite.check(
  Schema.isBetween({ maximum: 100_000, minimum: -100_000 })
);

const size = Schema.Finite.check(
  Schema.isBetween({ maximum: 100_000, minimum: 0 })
);

const box = Schema.Struct({
  height: size,
  width: size,
  x: coord,
  y: coord,
});

const color = toTrimmed(0, 100).check(
  Schema.isPattern(VECTOR_COLOR, {
    message:
      "must be a color such as #1e1e1e, rgb(…), a CSS color name, none or var(--token)",
  })
);

const paint = {
  fill: Schema.optional(Schema.NullOr(color)),
  stroke: Schema.optional(Schema.NullOr(color)),
  strokeWidth: Schema.optional(
    Schema.NullOr(
      Schema.Finite.check(Schema.isBetween({ maximum: 1000, minimum: 0 }))
    )
  ),
};

const place = {
  page: Schema.optional(toTrimmed(0, 300)),
  relativeParent: Schema.optional(Schema.Boolean),
  target: TargetSchema,
};

const schema = Schema.Union([
  Schema.Struct({
    box,
    name: Schema.optional(toTrimmed(1, 60)),
    op: Schema.Literal("shape"),
    shape: Schema.Literals(VECTOR_SHAPES),
    ...place,
    ...paint,
  }),
  Schema.Struct({
    box,
    name: Schema.optional(toTrimmed(1, 60)),
    op: Schema.Literal("text"),
    text: Schema.optional(toTrimmed(1, 200)),
    ...place,
  }),
  Schema.Struct({
    d: toTrimmed(1, VECTOR_PATH_MAX),
    name: Schema.optional(toTrimmed(1, 60)),
    op: Schema.Literal("path"),
    ...place,
    ...paint,
  }),
  Schema.Struct({
    boolean: Schema.Literals(BOOLEAN_OPS),
    op: Schema.Literal("boolean"),
    rects: Schema.optional(Schema.Tuple([box, box])),
    targets: Schema.Tuple([TargetSchema, TargetSchema]),
  }),
  Schema.Struct({
    op: Schema.Literal("paint"),
    target: TargetSchema,
    ...paint,
  }),
]);

const decodeRequest = toDecoder(schema, "error");

export function parseVectorRequest(raw: unknown): VectorRequest {
  const parsed = decodeRequest(raw);

  if (parsed._tag === "Failure") {
    throw new DirectEditError(
      "invalid_request",
      `request: ${toIssueText(parsed, "The vector request is not valid")}`
    );
  }

  return parsed.success as VectorRequest;
}

function relativeTo(
  plan: { target: ResolvedSource; code: string },
  request: { target: InsertTarget; relativeParent?: boolean }
): string {
  const source = request.target.source;

  if (
    !request.relativeParent ||
    !source ||
    source.file !== plan.target.relative
  ) {
    return plan.code;
  }

  const patched = patchSource(plan.target.relative, plan.code, {
    source,
    selector: request.target.selector ?? "",
    ...(request.target.tag ? { tag: request.target.tag } : {}),
    style: { position: "relative" },
  });

  return patched.code;
}

function pageFile(scope: InsertScope, page: string | undefined): string {
  const clean = (page ?? "").split(/[?#]/)[0]?.replace(/^\/+/, "") ?? "";

  if (clean === "") {
    return scope.project.entry ?? "index.html";
  }

  if (clean.endsWith("/")) {
    return `${clean}index.html`;
  }

  return /\.[a-z0-9]+$/i.test(clean) ? clean : `${clean}.html`;
}

async function bodyTarget(
  scope: InsertScope,
  request: PlacedRequest
): Promise<PlacedRequest> {
  if (
    request.target.source ||
    request.target.tag !== "body" ||
    scope.project.kind === "react"
  ) {
    return request;
  }

  const resolved = await resolveSource(
    scope.workTree,
    pageFile(scope, request.page)
  );

  const doc = parse(await readFile(resolved.file, "utf-8"), {
    sourceCodeLocationInfo: true,
  });

  const html = doc.childNodes.find(
    (node): node is Element => "tagName" in node && node.tagName === "html"
  );

  const body = html?.childNodes.find(
    (node): node is Element => "tagName" in node && node.tagName === "body"
  );

  const start = body?.sourceCodeLocation?.startTag;

  if (!start) {
    throw new DirectEditError(
      "invalid_request",
      `${resolved.relative} has no <body> tag to draw into`
    );
  }

  return {
    ...request,
    target: {
      ...request.target,
      source: {
        file: resolved.relative,
        line: start.startLine,
        col: start.startCol,
      },
    },
  };
}

async function planPlaced(
  scope: InsertScope,
  raw: PlacedRequest
): Promise<VectorPlan> {
  const request = await bodyTarget(scope, raw);
  const file = request.target.source?.file ?? "";
  const html = isHtmlFile(file);

  const placed = toPlacedSnippet(request, html);

  const plan = await planInsertJsx(scope, {
    target: request.target,
    position: "inside",
    jsx: placed.jsx,
  });

  return {
    target: plan.target,
    original: plan.original,
    code: relativeTo(plan, request),
    select: plan.select,
    title: `${placed.verb} in ${request.target.tag ? `<${request.target.tag}>` : plan.target.relative}`,
  };
}

async function sourceOf(
  scope: InsertScope,
  item: InsertTarget
): Promise<{
  resolved: ResolvedSource;
  code: string;
  at: { line: number; col: number };
}> {
  if (!item.source) {
    throw new DirectEditError(
      "invalid_request",
      "The shape has no source location. Select it again"
    );
  }

  const resolved = await resolveSource(scope.workTree, item.source.file);

  return {
    resolved,
    code: await readFile(resolved.file, "utf-8"),
    at: { line: item.source.line, col: item.source.col },
  };
}

async function planBooleanOp(
  scope: InsertScope,
  request: Extract<VectorRequest, { op: "boolean" }>
): Promise<VectorPlan> {
  const first = await sourceOf(scope, request.targets[0]);
  const second = await sourceOf(scope, request.targets[1]);

  if (first.resolved.file !== second.resolved.file) {
    throw new DirectEditError(
      "cannot_restructure",
      "The two shapes are in different files. Boolean operations work on shapes in one file"
    );
  }

  const doc = vectorDoc(first.resolved.relative, first.code);

  const plan = planBoolean(
    first.code,
    doc,
    [doc.node(first.at), doc.node(second.at)],
    request.boolean,
    request.rects
  );

  return {
    target: first.resolved,
    original: first.code,
    code: plan.code,
    select: [{ file: first.resolved.relative, ...plan.at, tag: "path" }],
    title: plan.title,
  };
}

function paintTargets(node: VNode, name: string): VNode[] {
  if (node.tag !== "svg") {
    return [node];
  }

  const shapes: VNode[] = [];

  const walk = (item: VNode) => {
    for (const child of item.children) {
      if (child.attrs[name] !== undefined || child.style[name] !== undefined) {
        shapes.push(child);
      }

      walk(child);
    }
  };

  walk(node);

  return shapes.length > 0 ? shapes : [node];
}

function paintChanges(request: VectorPaint): AttrChanges {
  const out: AttrChanges = {};

  if (request.fill !== undefined) {
    out.fill = request.fill ?? "none";
  }

  if (request.stroke !== undefined) {
    out.stroke = request.stroke;
  }

  if (request.strokeWidth !== undefined) {
    out["stroke-width"] =
      request.strokeWidth === null ? null : toPaintWidth(request.strokeWidth);
  }

  return out;
}

function planPaintCode(
  code: string,
  node: VNode,
  changes: AttrChanges,
  html: boolean,
  typescript: boolean
): string {
  const byNode = new Map<VNode, AttrChanges>();

  for (const [name, value] of Object.entries(changes)) {
    for (const item of paintTargets(node, name)) {
      byNode.set(item, {
        ...byNode.get(item),
        [html ? name : jsxAttrName(name)]: value,
      });
    }
  }

  let out = code;

  for (const [item, set] of [...byNode.entries()].sort(
    (a, b) => b[0].start - a[0].start
  )) {
    const at = { line: item.line, col: item.col };
    out = html
      ? setHtmlAttrs(out, at, set)
      : setJsxAttrs(out, at, typescript, set);
  }

  return out;
}

async function planPaint(
  scope: InsertScope,
  request: Extract<VectorRequest, { op: "paint" }>
): Promise<VectorPlan> {
  const found = await sourceOf(scope, request.target);
  const doc = vectorDoc(found.resolved.relative, found.code);
  const node = doc.node(found.at);

  if (node.tag !== "svg" && !doc.svgOf(node)) {
    throw new DirectEditError(
      "invalid_request",
      `<${node.tag}> is not an SVG shape`
    );
  }

  const changes = paintChanges(request);

  if (Object.keys(changes).length === 0) {
    throw new DirectEditError(
      "invalid_request",
      "Pass fill, stroke or strokeWidth"
    );
  }

  const code = planPaintCode(
    found.code,
    node,
    changes,
    doc.html,
    doc.typescript
  );

  const what = Object.keys(changes)
    .map((name) => name.replace("-", " "))
    .join(" and ");

  return {
    target: found.resolved,
    original: found.code,
    code,
    select: [
      {
        file: found.resolved.relative,
        line: node.line,
        col: node.col,
        tag: node.tag,
      },
    ],
    title: `Set ${what} of <${node.tag}>`,
  };
}

export async function planVector(
  scope: InsertScope,
  raw: unknown
): Promise<VectorPlan> {
  const request = parseVectorRequest(raw);

  if (
    request.op === "shape" ||
    request.op === "path" ||
    request.op === "text"
  ) {
    return planPlaced(scope, request);
  }

  if (request.op === "boolean") {
    return planBooleanOp(scope, request);
  }

  return planPaint(scope, request);
}

export async function applyVector(
  deps: DirectEditDeps,
  scope: InsertScope & { direction: Direction },
  raw: unknown
): Promise<VectorResult> {
  const { project, direction } = scope;
  parseVectorRequest(raw);
  assertCanEdit(deps, project, direction);
  const plan = await planVector(scope, raw);

  if (plan.code === plan.original) {
    throw new DirectEditError("invalid_request", "Nothing changed");
  }

  const meta: VersionMeta = { kind: "manual", prompt: `Vector: ${plan.title}` };

  const version = await writeAndCommitAll(
    deps,
    project,
    direction,
    [plan],
    plan.title,
    meta
  );

  deps.history?.record({
    projectId: project.id,
    directionId: direction.id,
    label: version.title,
    versionId: version.id,
    files: [
      {
        file: plan.target.file,
        relative: plan.target.relative,
        before: plan.original,
        after: plan.code,
      },
    ],
  });
  await publishVersion(deps, project, direction, version);

  return {
    file: plan.target.relative,
    version,
    select: plan.select,
    title: plan.title,
  };
}
