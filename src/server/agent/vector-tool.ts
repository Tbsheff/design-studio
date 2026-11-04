import { Schema } from "effect";

import type { InsertTarget } from "../../shared/insert.js";
import {
  BOOLEAN_OPS,
  VECTOR_COLOR,
  VECTOR_PATH_MAX,
} from "../../shared/vector.js";
import type { VectorBox, VectorRequest } from "../../shared/vector.js";
import { toSdkFieldSet } from "../agent-tools/sdk-shape.js";
import { planVector } from "../direct-edit/commit/vector-ops.js";
import { writeAtomic } from "../direct-edit/index.js";
import { describeElements } from "../page-probe/element.js";
import { refusal, writeProblem } from "./direct-tools.js";
import type { DirectToolDeps } from "./direct-tools.js";
import { targetOf } from "./insert-tool.js";
import { editPageUrl } from "./run-target.js";
import {
  toDefaulted,
  toOptional,
  toOptionalText,
  toToolInput,
  toTrimmedText,
} from "./tool-input.js";
import type { ToolArgs } from "./tool-input.js";

type ToolText = Readonly<{
  content: { type: "text"; text: string }[];
  isError?: boolean;
}>;

const color = toTrimmedText(0, 100).check(Schema.isPattern(VECTOR_COLOR));

const toNullableColor = (
  description: string
): Schema.optionalKey<Schema.NullOr<Schema.Trim>> =>
  Schema.optionalKey(Schema.NullOr(color).annotate({ description }));

const strokeWidthRange = Schema.isBetween({ maximum: 1000, minimum: 0 });

const paint = {
  fill: toNullableColor(
    'Fill color, for example "#3b82f6" or "var(--primary)". null for no fill.'
  ),
  stroke: toNullableColor("Stroke color. null removes the stroke."),
  strokeWidth: Schema.optionalKey(
    Schema.NullOr(Schema.Number.check(strokeWidthRange)).annotate({
      description: "Stroke width in px.",
    })
  ),
};

const where = {
  path: toOptionalText(
    0,
    300,
    "Page path. Leave out for the page of the frame in <canvas-context>."
  ),
  targetSelector: toOptionalText(
    1,
    2000,
    "CSS selector of the element on the live page."
  ),
  targetSource: toOptionalText(
    0,
    1100,
    "Or the element as file:line:col of its tag."
  ),
};

const sizeNumber = Schema.Number.check(
  Schema.isBetween({ maximum: 100_000, minimum: 1 })
);

const offsetNumber = Schema.Number.check(
  Schema.isBetween({ maximum: 100_000, minimum: -100_000 })
);

export const VECTOR_DRAW_SHORT =
  "Draw a rectangle, ellipse or pen path as an inline <svg> placed at x, y in a parent element (one undo step).";

export const VECTOR_BOOLEAN_SHORT =
  "Union, subtract, intersect or exclude two SVG shapes into one <path>.";

export const VECTOR_PAINT_SHORT =
  "Set fill, stroke or stroke width of an SVG shape.";

const drawVectorFields = {
  ...where,
  d: toOptionalText(
    1,
    VECTOR_PATH_MAX,
    "SVG path data in px from the parent padding box. End with Z to close it."
  ),
  height: Schema.optionalKey(sizeNumber),
  makeParentRelative: toDefaulted(
    Schema.Boolean,
    false,
    "Also set position: relative on the parent."
  ),
  name: Schema.optionalKey(toTrimmedText(1, 60)),
  shape: Schema.Literals(["rect", "ellipse", "path"]).annotate({
    description: "rect or ellipse: pass x, y, width, height. path: pass d.",
  }),
  width: Schema.optionalKey(sizeNumber),
  x: toDefaulted(
    offsetNumber,
    0,
    "Left edge in px from the parent padding box."
  ),
  y: toDefaulted(
    offsetNumber,
    0,
    "Top edge in px from the parent padding box."
  ),
  ...paint,
};

const booleanShapesFields = {
  op: Schema.Literals(BOOLEAN_OPS).annotate({
    description: "union, subtract (first minus second), intersect or exclude.",
  }),
  path: where.path,
  selectors: toOptional(
    Schema.Tuple([toTrimmedText(1, 2000), toTrimmedText(1, 2000)]),
    "Two CSS selectors of SVG shapes. The first keeps its place and paint."
  ),
  sources: toOptional(
    Schema.Tuple([toTrimmedText(0, 1100), toTrimmedText(0, 1100)]),
    "Or the two shapes as file:line:col."
  ),
};

const paintShapeFields = { ...where, ...paint };

export const drawVectorShape = toSdkFieldSet(drawVectorFields);
export const booleanShapesShape = toSdkFieldSet(booleanShapesFields);
export const paintShapeShape = toSdkFieldSet(paintShapeFields);

const drawSchema = toToolInput(drawVectorFields);
const booleanSchema = toToolInput(booleanShapesFields);
const paintSchema = toToolInput(paintShapeFields);

function text(message: string, isError = false): ToolText {
  return {
    content: [{ text: message, type: "text" }],
    ...(isError ? { isError: true } : {}),
  };
}

function issues(name: string, error: string): ToolText {
  return text(`${name}: ${error}`, true);
}

function paintOf(input: {
  fill?: string | null | undefined;
  stroke?: string | null | undefined;
  strokeWidth?: number | null | undefined;
}) {
  return {
    ...(input.fill === undefined
      ? {}
      : { fill: input.fill === "none" ? null : input.fill }),
    ...(input.stroke === undefined ? {} : { stroke: input.stroke }),
    ...(input.strokeWidth === undefined
      ? {}
      : { strokeWidth: input.strokeWidth }),
  };
}

async function write(
  deps: DirectToolDeps,
  name: string,
  request: VectorRequest
): Promise<ToolText> {
  const { project, direction, previewUrl } = deps.ctx;

  const previewOrigin =
    previewUrl && project.kind === "react" ? new URL(previewUrl).origin : null;

  const plan = await planVector(
    { previewOrigin, project, workTree: direction.workTree },
    request
  );

  const problem = writeProblem(deps.ctx, plan.target.relative);

  if (problem) {
    return text(problem, true);
  }

  await writeAtomic(plan.target.file, plan.code);

  const at = plan.select
    .map((item) => `${item.file}:${item.line}:${item.col}`)
    .join(", ");

  return text(
    `${plan.title} at ${at}. The run saves this change in its version, like your file edits.`
  );
}

async function guarded(
  deps: DirectToolDeps,
  name: string,
  task: () => Promise<ToolText>
): Promise<ToolText> {
  const blocked = refusal(deps.ctx, name);

  if (blocked) {
    return text(blocked, true);
  }

  try {
    return await task();
  } catch (error) {
    return text(
      `${name} failed: ${error instanceof Error ? error.message : String(error)}`,
      true
    );
  }
}

export function runDrawVector(
  deps: DirectToolDeps,
  args: ToolArgs<typeof drawSchema>
): Promise<ToolText> {
  return guarded(deps, "draw_vector", async () => {
    const parsed = drawSchema.safeParse(args);

    if (!parsed.success) {
      return issues("draw_vector", parsed.error);
    }

    const input = parsed.data;

    if (
      (input.targetSelector === undefined) ===
      (input.targetSource === undefined)
    ) {
      return text("Pass targetSelector or targetSource, not both.", true);
    }

    if (
      input.shape === "path"
        ? !input.d
        : input.width === undefined || input.height === undefined
    ) {
      return text(
        "shape path needs d; rect and ellipse need width and height.",
        true
      );
    }

    const target = await targetOf(deps, input);

    if (typeof target === "string") {
      return text(target, true);
    }

    const common = {
      relativeParent: input.makeParentRelative,
      target,
      ...paintOf(input),
    };

    const request: VectorRequest =
      input.shape === "path"
        ? {
            d: input.d ?? "",
            op: "path",
            ...(input.name ? { name: input.name } : {}),
            ...common,
          }
        : {
            box: {
              height: input.height ?? 1,
              width: input.width ?? 1,
              x: input.x,
              y: input.y,
            },
            op: "shape",
            shape: input.shape,
            ...common,
          };

    return write(deps, "draw_vector", request);
  });
}

async function rectsOf(
  deps: DirectToolDeps,
  page: string | undefined,
  selectors: [string, string]
): Promise<[VectorBox, VectorBox] | undefined> {
  if (!deps.ctx.previewUrl) {
    return undefined;
  }

  const found = await describeElements(
    deps.preview,
    editPageUrl(deps.ctx, page),
    selectors
  ).catch(() => []);

  const [a, b] = found;

  return a && b ? [a.rect, b.rect] : undefined;
}

export function runBooleanShapes(
  deps: DirectToolDeps,
  args: ToolArgs<typeof booleanSchema>
): Promise<ToolText> {
  return guarded(deps, "boolean_shapes", async () => {
    const parsed = booleanSchema.safeParse(args);

    if (!parsed.success) {
      return issues("boolean_shapes", parsed.error);
    }

    const input = parsed.data;

    if ((input.selectors === undefined) === (input.sources === undefined)) {
      return text("Pass selectors or sources, not both.", true);
    }

    const targets: InsertTarget[] = [];

    for (const index of [0, 1] as const) {
      const found = await targetOf(
        deps,
        input.selectors
          ? { path: input.path, targetSelector: input.selectors[index] }
          : { path: input.path, targetSource: input.sources?.[index] }
      );

      if (typeof found === "string") {
        return text(found, true);
      }

      targets.push(found);
    }

    const rects = input.selectors
      ? await rectsOf(deps, input.path, input.selectors)
      : undefined;

    return write(deps, "boolean_shapes", {
      boolean: input.op,
      op: "boolean",
      targets: [targets[0] as InsertTarget, targets[1] as InsertTarget],
      ...(rects ? { rects } : {}),
    });
  });
}

export function runPaintShape(
  deps: DirectToolDeps,
  args: ToolArgs<typeof paintSchema>
): Promise<ToolText> {
  return guarded(deps, "paint_shape", async () => {
    const parsed = paintSchema.safeParse(args);

    if (!parsed.success) {
      return issues("paint_shape", parsed.error);
    }

    const input = parsed.data;

    if (
      (input.targetSelector === undefined) ===
      (input.targetSource === undefined)
    ) {
      return text("Pass targetSelector or targetSource, not both.", true);
    }

    const target = await targetOf(deps, input);

    if (typeof target === "string") {
      return text(target, true);
    }

    return write(deps, "paint_shape", {
      op: "paint",
      target,
      ...paintOf(input),
    });
  });
}
