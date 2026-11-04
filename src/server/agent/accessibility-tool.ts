import { z } from "zod";

import { AccessibilityError } from "../accessibility/errors.js";
import { DEFAULT_VIEWPORT, frameOf } from "../accessibility/frame.js";
import type { AccessibilityFrame } from "../accessibility/frame.js";
import {
  INSPECT_ACCESSIBILITY_DESCRIPTION,
  inspectAccessibilityFields,
  NO_ACCESSIBILITY_CHANGE,
  SET_ACCESSIBILITY_DESCRIPTION,
  setAccessibilityFields,
  toAccessibilityChanges,
} from "../accessibility/input.js";
import { inspectAccessibility } from "../accessibility/inspect.js";
import {
  planAccessibility,
  toAccessibilityResult,
} from "../accessibility/set.js";
import type { AccessibilityTarget } from "../accessibility/set.js";
import type { BreakpointScope } from "../breakpoints/commit.js";
import { readDesignSystemState } from "../design-system/state.js";
import type { WrittenFile } from "../direct-edit/commit/batch.js";
import { writeAtomic } from "../direct-edit/commit/edit-source.js";
import { DirectEditError } from "../direct-edit/engine/errors.js";
import { describeElements } from "../page-probe/element.js";
import { canvasFrames, refusal, writeProblem } from "./direct-tools.js";
import type { DirectToolDeps } from "./direct-tools.js";
import { editPageUrl } from "./run-target.js";

interface ToolContent {
  text: string;
  type: "text";
}

interface ToolText {
  [key: string]: boolean | ToolContent[] | undefined;
  content: ToolContent[];
  isError?: boolean;
}

type Located =
  | { message: string; ok: false }
  | { ok: true; target: AccessibilityTarget };

const SELECTOR_MAX = 2000;
const SOURCE_MAX = 1100;
const PATH_MAX = 300;
const FRAME_MAX = 60;

const LOC = /^(?<file>.+):(?<line>\d+):(?<col>\d+)$/u;

const RUN_NOTE =
  "The run saves this change in its version, like your file edits.";

const NO_SOURCE = "The layer has no source location. Pass targetSource.";

const ONE_TARGET = "Pass targetSelector or targetSource, not both.";

const NO_PREVIEW =
  "Preview is not running for this direction. Pass targetSource instead.";

const pathField = z
  .string()
  .trim()
  .max(PATH_MAX)
  .optional()
  .describe(
    "Page path. Leave out for the page of the frame in <canvas-context> (or the entry page)."
  );

const selectorField = z.string().trim().min(1).max(SELECTOR_MAX).optional();

const inspectAccessibilityInput = {
  frame: z
    .string()
    .trim()
    .min(1)
    .max(FRAME_MAX)
    .optional()
    .describe(
      "Canvas frame id or @label. Its page and size are used. Leave out for path."
    ),
  path: pathField,
  targetSelector: selectorField.describe(
    "CSS selector or layer id of one layer. Leave out to check the whole page."
  ),
  ...inspectAccessibilityFields,
};

const setAccessibilityInput = {
  path: pathField,
  targetSelector: selectorField.describe(
    "CSS selector or layer id of the layer on the live page."
  ),
  targetSource: z
    .string()
    .trim()
    .max(SOURCE_MAX)
    .optional()
    .describe('Or the layer as file:line:col, for example "src/App.tsx:12:7".'),
  ...setAccessibilityFields,
};

const inspectSchema = z.strictObject(inspectAccessibilityInput);
const setSchema = z.strictObject(setAccessibilityInput);

const inspectAccessibilityDescription = INSPECT_ACCESSIBILITY_DESCRIPTION;

const setAccessibilityDescription = SET_ACCESSIBILITY_DESCRIPTION;

const reply = (message: string): ToolText => ({
  content: [{ text: message, type: "text" }],
});

const refuse = (message: string): ToolText => ({
  content: [{ text: message, type: "text" }],
  isError: true,
});

const issues = (tool: string, error: z.ZodError): ToolText => {
  const lines = error.issues.map(
    (issue) => `${issue.path.join(".") || "input"}: ${issue.message}`
  );

  return refuse(`${tool}: ${lines.join("; ")}`);
};

const caught = (tool: string, error: Error | null): ToolText => {
  if (error instanceof AccessibilityError || error instanceof DirectEditError) {
    return refuse(`${tool}: ${error.message}`);
  }

  if (error instanceof Error) {
    return refuse(`${tool} failed: ${error.message}`);
  }

  return refuse(`${tool} failed: ${String(error)}`);
};

const scopeOf = (deps: DirectToolDeps): BreakpointScope => ({
  direction: deps.ctx.direction,
  project: deps.ctx.project,
  workTree: deps.ctx.direction.workTree,
});

const frameFor = async (
  deps: DirectToolDeps,
  ref: string | undefined
): Promise<AccessibilityFrame | null> => {
  if (!ref) {
    return null;
  }

  return frameOf(await canvasFrames(deps), ref);
};

const inspectWith = async (
  deps: DirectToolDeps,
  input: z.output<typeof inspectSchema>
): Promise<ToolText> => {
  if (!deps.ctx.previewUrl) {
    return refuse("Preview is not running for this direction.");
  }

  const frame = await frameFor(deps, input.frame);
  const page = frame?.page ?? input.path;
  const address = editPageUrl(deps.ctx, page);

  const state = await readDesignSystemState(
    deps.ctx.project,
    deps.ctx.direction
  );

  const report = await inspectAccessibility(deps.preview, state.entries, {
    frame: frame?.id ?? input.frame ?? "f1",
    page: page ?? "/",
    passing: input.includePassing ?? false,
    root: input.targetSelector ?? null,
    url: address,
    viewport: frame?.viewport ?? DEFAULT_VIEWPORT,
  });

  return reply(JSON.stringify(report));
};

const runInspectAccessibility = async (
  deps: DirectToolDeps,
  args: z.input<typeof inspectSchema>
): Promise<ToolText> => {
  const parsed = inspectSchema.safeParse(args);

  if (!parsed.success) {
    return issues("inspect_accessibility", parsed.error);
  }

  try {
    return await inspectWith(deps, parsed.data);
  } catch (error) {
    return caught("inspect_accessibility", error as Error | null);
  }
};

const fromSource = (raw: string): Located => {
  const groups = LOC.exec(raw)?.groups;

  if (!groups) {
    return { message: "targetSource must be file:line:col.", ok: false };
  }

  return {
    ok: true,
    target: {
      source: {
        col: Number(groups.col),
        file: groups.file ?? "",
        line: Number(groups.line),
      },
      tag: null,
      usedAt: null,
    },
  };
};

const locate = async (
  deps: DirectToolDeps,
  input: z.output<typeof setSchema>
): Promise<Located> => {
  if (input.targetSource) {
    return fromSource(input.targetSource);
  }

  if (!deps.ctx.previewUrl) {
    return { message: NO_PREVIEW, ok: false };
  }

  const sel = input.targetSelector ?? "";
  const url = editPageUrl(deps.ctx, input.path);
  const [element] = await describeElements(deps.preview, url, [sel]);

  if (!element) {
    return { message: `No element matches ${sel} on the page.`, ok: false };
  }

  if (!element.source) {
    return { message: NO_SOURCE, ok: false };
  }

  return {
    ok: true,
    target: {
      source: element.source,
      tag: element.tag,
      usedAt: element.usedAt ?? null,
    },
  };
};

const writeAll = async (
  deps: DirectToolDeps,
  written: readonly WrittenFile[]
): Promise<string | null> => {
  const problem = written
    .map((entry) => writeProblem(deps.ctx, entry.target.relative))
    .find((entry) => entry !== null);

  if (problem) {
    return problem;
  }

  await Promise.all(
    written.map((entry) => writeAtomic(entry.target.file, entry.code))
  );

  return null;
};

const setWith = async (
  deps: DirectToolDeps,
  input: z.output<typeof setSchema>
): Promise<ToolText> => {
  const changes = toAccessibilityChanges(input);

  if (changes === null) {
    return refuse(NO_ACCESSIBILITY_CHANGE);
  }

  const located = await locate(deps, input);

  if (!located.ok) {
    return refuse(located.message);
  }

  const plan = await planAccessibility(scopeOf(deps), {
    changes,
    target: located.target,
  });

  const problem = await writeAll(deps, plan.written);

  if (problem) {
    return refuse(problem);
  }

  const result = JSON.stringify(toAccessibilityResult(plan, null));

  return reply(`${plan.title}. ${RUN_NOTE} ${result}`);
};

const runSetAccessibility = async (
  deps: DirectToolDeps,
  args: z.input<typeof setSchema>
): Promise<ToolText> => {
  const blocked = refusal(deps.ctx, "set_accessibility");

  if (blocked) {
    return refuse(blocked);
  }

  const parsed = setSchema.safeParse(args);

  if (!parsed.success) {
    return issues("set_accessibility", parsed.error);
  }

  if (
    Boolean(parsed.data.targetSelector) === Boolean(parsed.data.targetSource)
  ) {
    return refuse(ONE_TARGET);
  }

  try {
    return await setWith(deps, parsed.data);
  } catch (error) {
    return caught("set_accessibility", error as Error | null);
  }
};

export {
  inspectAccessibilityDescription,
  inspectAccessibilityInput,
  runInspectAccessibility,
  runSetAccessibility,
  setAccessibilityDescription,
  setAccessibilityInput,
};
