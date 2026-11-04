import { Schema } from "effect";

import { unchangedNote } from "../../shared/arrange-plan.js";
import {
  ALIGN_OPS,
  DISTRIBUTE_OPS,
  arrangeLabel,
} from "../../shared/arrange.js";
import type { ArrangeAction } from "../../shared/arrange.js";
import {
  toRefinedToolInput,
  toSdkFieldSet,
  toToolInput,
  toTrimmedText,
} from "../agent-tools/index.js";
import type { ToolArgs, ToolDecoded } from "../agent-tools/index.js";
import { canvasOwner, findFrame, readCanvasAt } from "../canvas/index.js";
import {
  ARRANGE_TARGETS_MAX,
  DEFAULT_ARRANGE_VIEWPORT,
  measureTargets,
  planArrange,
} from "../direct-edit/commit/index.js";
import { writeAtomic } from "../direct-edit/index.js";
import { withPagePath } from "../export/source.js";
import {
  isLayerRef,
  LayerRefError,
  memoPage,
  resolveLayerRef,
  scopeOf,
} from "../page-probe/index.js";
import { refusal, writeProblem } from "./direct-tools.js";
import type { DirectToolDeps } from "./direct-tools.js";

type ToolText = Readonly<{
  content: { type: "text"; text: string }[];
  isError?: boolean;
}>;

const selector = toTrimmedText(1, 2000).annotate({
  description: "CSS selector or layer id from get_layers.",
});

const selectorTarget = Schema.Struct({ selector });

const page = {
  frame: Schema.optionalKey(
    toTrimmedText(1, 60).annotate({
      description:
        "Canvas frame id or @label; its page and size are used. Leave out for the entry page at 1440x900.",
    })
  ),
  path: Schema.optionalKey(
    toTrimmedText(0, 300).annotate({
      description: "Page path instead of the frame page.",
    })
  ),
};

const arrangeFields = {
  ...page,
  align: Schema.optionalKey(Schema.Literals(ALIGN_OPS)),
  distribute: Schema.optionalKey(Schema.Literals(DISTRIBUTE_OPS)),
  targets: Schema.Array(selectorTarget)
    .check(Schema.isMinLength(1), Schema.isMaxLength(ARRANGE_TARGETS_MAX))
    .annotate({ description: "Sibling elements to arrange (one parent)." }),
  tidy: Schema.optionalKey(Schema.Literal(true)),
};

const measureFields = {
  ...page,
  a: selectorTarget,
  b: selectorTarget,
};

const arrangeShape = toSdkFieldSet(arrangeFields);

const measureShape = toSdkFieldSet(measureFields);

const arrangeSchema = toRefinedToolInput(arrangeFields, (input) => {
  const count = [input.align, input.distribute, input.tidy].filter(
    (value) => value !== undefined
  ).length;

  if (count === 1) {
    return null;
  }

  return "pass one of align, distribute or tidy";
});

const measureSchema = toToolInput(measureFields);

const RUN_NOTE =
  "The run saves this change in its version, like your file edits.";

function text(message: string, isError = false): ToolText {
  return {
    content: [{ text: message, type: "text" }],
    ...(isError ? { isError: true } : {}),
  };
}

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

interface PageTarget {
  url: string;
  viewport: { width: number; height: number };
}

async function pageOf(
  deps: DirectToolDeps,
  input: { frame?: string | undefined; path?: string | undefined }
): Promise<PageTarget> {
  if (!deps.ctx.previewUrl) {
    throw new Error(
      "Preview is not running for this direction, so elements cannot be found."
    );
  }
  const frames = input.frame
    ? ((await readCanvasAt(canvasOwner(deps.ctx.project).workTree)).canvas
        ?.frames ?? [])
    : [];

  const frame = input.frame ? findFrame(frames, input.frame) : null;

  if (input.frame && !frame && input.frame !== "f1") {
    throw new Error(`No frame ${input.frame} on the canvas.`);
  }
  return {
    url: withPagePath(
      deps.ctx.previewUrl,
      input.path || frame?.path || undefined
    ),
    viewport: frame
      ? { height: frame.height, width: frame.width }
      : DEFAULT_ARRANGE_VIEWPORT,
  };
}

function memoPath(
  deps: DirectToolDeps,
  input: { frame?: string | undefined; path?: string | undefined },
  refs: string[]
): string | undefined {
  if (input.path !== undefined || input.frame !== undefined) {
    return input.path;
  }
  const scope = scopeOf(deps.ctx.project.id, deps.ctx.direction.id);
  const layer = refs.find((ref) => isLayerRef(ref));

  return layer ? memoPage(scope, layer.trim()) : undefined;
}

async function resolveSelector(
  deps: DirectToolDeps,
  target: PageTarget,
  raw: string
): Promise<string> {
  if (!isLayerRef(raw)) {
    return raw;
  }
  return resolveLayerRef(
    deps.preview,
    target.url,
    target.viewport,
    scopeOf(deps.ctx.project.id, deps.ctx.direction.id),
    raw.trim()
  );
}

function actionOf(input: ToolDecoded<typeof arrangeSchema>): ArrangeAction {
  if (input.align) {
    return { align: input.align };
  }
  if (input.distribute) {
    return { distribute: input.distribute };
  }
  return { tidy: true };
}

export async function runArrange(
  deps: DirectToolDeps,
  args: ToolArgs<typeof arrangeSchema>
): Promise<ToolText> {
  const blocked = refusal(deps.ctx, "arrange");

  if (blocked) {
    return text(blocked, true);
  }
  const parsed = arrangeSchema.safeParse(args);

  if (!parsed.success) {
    return text(`arrange: ${parsed.error}`, true);
  }
  try {
    const target = await pageOf(deps, {
      ...parsed.data,
      path: memoPath(
        deps,
        parsed.data,
        parsed.data.targets.map((item) => item.selector)
      ),
    });

    const targets = await Promise.all(
      parsed.data.targets.map(async (item) => ({
        selector: await resolveSelector(deps, target, item.selector),
      }))
    );

    const action = actionOf(parsed.data);

    const plan = await planArrange(
      deps.preview,
      target.url,
      { project: deps.ctx.project, workTree: deps.ctx.direction.workTree },
      { action, targets, viewport: target.viewport }
    );

    if (plan.changed.length === 0) {
      return text(unchangedNote(action, plan.note));
    }
    for (const file of plan.changed) {
      const problem = writeProblem(deps.ctx, file.target.relative);

      if (problem) {
        return text(problem, true);
      }
    }

    for (const file of plan.changed) {
      await writeAtomic(file.target.file, file.code);
    }
    const wrote = plan.writes
      .map(
        (entry) =>
          `${entry.selector} {${Object.entries(entry.style)
            .map(([key, value]) => `${key}: ${value ?? "removed"}`)
            .join("; ")}}`
      )
      .join(", ");

    const classes =
      plan.classes.length > 0 ? ` Classes: ${plan.classes.join(" ")}.` : "";

    return text(
      `${arrangeLabel(action)} (${plan.mode}): ${wrote}. Files: ${plan.changed.map((file) => file.target.relative).join(", ")}.${classes}${plan.note ? ` ${plan.note}` : ""} ${RUN_NOTE}`
    );
  } catch (error) {
    return text(
      error instanceof LayerRefError
        ? error.message
        : `arrange failed: ${describeError(error)}`,
      true
    );
  }
}

export async function runMeasure(
  deps: DirectToolDeps,
  args: ToolArgs<typeof measureSchema>
): Promise<ToolText> {
  const parsed = measureSchema.safeParse(args);

  if (!parsed.success) {
    return text(`measure: ${parsed.error}`, true);
  }
  try {
    const target = await pageOf(deps, {
      ...parsed.data,
      path: memoPath(deps, parsed.data, [
        parsed.data.a.selector,
        parsed.data.b.selector,
      ]),
    });

    const [a, b] = await Promise.all([
      resolveSelector(deps, target, parsed.data.a.selector),
      resolveSelector(deps, target, parsed.data.b.selector),
    ]);

    return text(
      JSON.stringify(
        await measureTargets(deps.preview, target.url, target.viewport, a, b),
        null,
        2
      )
    );
  } catch (error) {
    return text(
      error instanceof LayerRefError
        ? error.message
        : `measure failed: ${describeError(error)}`,
      true
    );
  }
}

export { arrangeShape, measureShape };
