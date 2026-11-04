import { Schema } from "effect";

import { DEFAULT_FRAME_STATE } from "../../shared/actions/_core/frame-state.js";
import {
  SEARCH_PROPERTIES,
  STYLE_KINDS,
  STYLE_REPLACE_MAX,
  STYLE_TOKEN_MAX,
  matchesOf,
  replaceSummary,
} from "../../shared/actions/_core/style-search.js";
import type { StyleQuery } from "../../shared/actions/_core/style-search.js";
import {
  toOptional,
  toOptionalText,
  toRefinedToolInput,
  toSdkFieldSet,
  toToolInput,
  toTrimmedText,
} from "../agent-tools/index.js";
import type { ToolArgs } from "../agent-tools/index.js";
import { findFrame } from "../canvas/index.js";
import {
  planStyleReplace,
  scanPageStyles,
  styleReport,
  tokenEntriesFor,
  tokenLookupFor,
} from "../direct-edit/commit/index.js";
import { writeAtomic } from "../direct-edit/index.js";
import { canvasFrames, refusal, writeProblem } from "./direct-tools.js";
import type { DirectToolDeps } from "./direct-tools.js";
import { isContextFrame, pageUrl } from "./run-target.js";

type ToolText = Readonly<{
  content: { type: "text"; text: string }[];
  isError?: boolean;
}>;

const property = toOptional(
  Schema.Literals([...STYLE_KINDS, ...SEARCH_PROPERTIES] as [
    string,
    ...string[],
  ]),
  "color, font-size, radius, spacing, or one CSS property such as background-color or padding-top. Leave out for all."
);

const scope = {
  frame: toOptionalText(
    1,
    60,
    "Canvas frame id or @label; its page and size are used. Leave out for the frame from <canvas-context> (or the entry page at 1440x900)."
  ),
  value: toOptionalText(
    1,
    200,
    'Value to match, for example "#1c1f23" or "14px". Compared with the computed value.'
  ),
  property,
};

const findStylesFields = {
  ...scope,
  className: toOptionalText(1, 120, "Only elements with this class."),
};

const replaceStyleFields = {
  ...scope,
  token: toTrimmedText(1, STYLE_TOKEN_MAX).annotate({
    description:
      'A CSS variable ("--primary") or, in a Tailwind project, a theme class ("bg-primary", "text-sm", "rounded-lg", "p-4").',
  }),
};

export const findStylesShape = toSdkFieldSet(findStylesFields);

export const replaceStyleShape = toSdkFieldSet(replaceStyleFields);

const findSchema = toToolInput(findStylesFields);

const replaceSchema = toRefinedToolInput(replaceStyleFields, (input) => {
  if (input.value === undefined) {
    return "replace_style needs value";
  }

  return null;
});

function text(message: string, isError = false): ToolText {
  return {
    content: [{ text: message, type: "text" }],
    ...(isError ? { isError: true } : {}),
  };
}

async function pageOf(
  deps: DirectToolDeps,
  ref: string | undefined
): Promise<{ url: string; viewport: { width: number; height: number } }> {
  if (!deps.ctx.previewUrl) {
    throw new Error(
      "Preview is not running for this direction, so styles cannot be scanned."
    );
  }

  const { target } = deps.ctx;

  if (target && (!ref || isContextFrame(deps.ctx, ref))) {
    return {
      url: pageUrl(deps.ctx.previewUrl, target.path, target.state),
      viewport: { height: target.height, width: target.width },
    };
  }

  const frames = ref ? await canvasFrames(deps) : [];
  const frame = ref ? findFrame(frames, ref) : null;

  if (ref && !frame && ref !== "f1") {
    throw new Error(`No frame ${ref} on the canvas.`);
  }

  const state =
    frame && frame.id === target?.id ? target.state : DEFAULT_FRAME_STATE;

  return {
    url: pageUrl(deps.ctx.previewUrl, frame?.path ?? "", state),
    viewport: frame
      ? { height: frame.height, width: frame.width }
      : { height: 900, width: 1440 },
  };
}

function queryOf(input: {
  property?: string;
  value?: string;
  className?: string;
}): StyleQuery {
  return {
    ...(input.property
      ? { property: input.property as StyleQuery["property"] }
      : {}),
    ...(input.value ? { value: input.value } : {}),
    ...(input.className ? { className: input.className } : {}),
  };
}

export async function runFindStyles(
  deps: DirectToolDeps,
  args: ToolArgs<typeof findSchema>
): Promise<ToolText> {
  const parsed = findSchema.safeParse(args);

  if (!parsed.success) {
    return text(`find_styles: ${parsed.error}`, true);
  }

  try {
    const page = await pageOf(deps, parsed.data.frame);

    const result = await scanPageStyles(
      deps.preview,
      page.url,
      page.viewport,
      queryOf(parsed.data)
    );

    const report = styleReport(
      result,
      tokenLookupFor(
        await tokenEntriesFor(deps.ctx.project, deps.ctx.direction)
      )
    );

    return text(JSON.stringify(report, null, 2));
  } catch (error) {
    return text(
      `find_styles failed: ${error instanceof Error ? error.message : String(error)}`,
      true
    );
  }
}

export async function runReplaceStyle(
  deps: DirectToolDeps,
  args: ToolArgs<typeof replaceSchema>
): Promise<ToolText> {
  const blocked = refusal(deps.ctx, "replace_style");

  if (blocked) {
    return text(blocked, true);
  }

  const parsed = replaceSchema.safeParse(args);

  if (!parsed.success) {
    return text(`replace_style: ${parsed.error}`, true);
  }

  try {
    const page = await pageOf(deps, parsed.data.frame);

    const matches = matchesOf(
      (
        await scanPageStyles(
          deps.preview,
          page.url,
          page.viewport,
          queryOf(parsed.data)
        )
      ).hits
    ).slice(0, STYLE_REPLACE_MAX);

    if (matches.length === 0) {
      return text(
        `No element with a source location uses ${parsed.data.value ?? "that value"}.`
      );
    }

    const plan = await planStyleReplace(
      deps.ctx.direction.workTree,
      deps.ctx.project.kind,
      { matches, token: parsed.data.token }
    );

    for (const file of plan.changed) {
      const problem = writeProblem(deps.ctx, file.target.relative);

      if (problem) {
        return text(problem, true);
      }
    }

    for (const file of plan.changed) {
      await writeAtomic(file.target.file, file.code);
    }

    const files = plan.changed.map((file) => file.target.relative).join(", ");

    const classes =
      plan.wrote === "classes" || plan.wrote === "mixed"
        ? ` Wrote classes.`
        : "";

    return text(
      `${replaceSummary(plan, parsed.data.token)}.${files ? ` Files: ${files}.` : ""}${classes} The run saves this change in its version, like your file edits.`
    );
  } catch (error) {
    return text(
      `replace_style failed: ${error instanceof Error ? error.message : String(error)}`,
      true
    );
  }
}
