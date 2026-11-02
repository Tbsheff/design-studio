import { z } from "zod";

import type { SourceLoc } from "../../shared/contracts.js";
import type { BreakpointScope } from "../breakpoints/commit.js";
import { BreakpointError } from "../breakpoints/errors.js";
import {
  LIST_BREAKPOINTS_DESCRIPTION,
  listBreakpointFields,
  SET_BREAKPOINT_STYLE_DESCRIPTION,
  setBreakpointFields,
  toStyleInput,
} from "../breakpoints/input.js";
import { listBreakpoints } from "../breakpoints/list.js";
import { planBreakpointStyle, toBreakpointResult } from "../breakpoints/set.js";
import type { BreakpointTarget } from "../breakpoints/set.js";
import type { WrittenFile } from "../direct-edit/batch.js";
import { writeAtomic } from "../direct-edit/commit/edit-source.js";
import { DirectEditError } from "../direct-edit/engine/errors.js";
import { canvasFrames, refusal, writeProblem } from "./direct-tools.js";
import type { DirectToolDeps } from "./direct-tools.js";
import { targetOf } from "./insert-tool.js";

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
  | { ok: true; target: BreakpointTarget };

const SELECTOR_MAX = 2000;
const SOURCE_MAX = 1100;
const PATH_MAX = 300;

const RUN_NOTE =
  "The run saves this change in its version, like your file edits.";

const NO_SOURCE = "The layer has no source location. Pass targetSource.";

const targetInput = {
  path: z
    .string()
    .trim()
    .max(PATH_MAX)
    .optional()
    .describe(
      "Page path. Leave out for the page of the frame in <canvas-context> (or the entry page)."
    ),
  targetSelector: z
    .string()
    .trim()
    .min(1)
    .max(SELECTOR_MAX)
    .optional()
    .describe("CSS selector or layer id of the layer on the live page."),
  targetSource: z
    .string()
    .trim()
    .max(SOURCE_MAX)
    .optional()
    .describe('Or the layer as file:line:col, for example "src/App.tsx:12:7".'),
};

const listBreakpointsInput = { ...targetInput, ...listBreakpointFields };

const setBreakpointStyleInput = { ...targetInput, ...setBreakpointFields };

const listSchema = z.strictObject(listBreakpointsInput);
const setSchema = z.strictObject(setBreakpointStyleInput);

const listBreakpointsDescription = LIST_BREAKPOINTS_DESCRIPTION;

const setBreakpointStyleDescription = SET_BREAKPOINT_STYLE_DESCRIPTION;

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
  if (error instanceof BreakpointError || error instanceof DirectEditError) {
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

const locate = async (
  deps: DirectToolDeps,
  input: z.output<typeof listSchema>
): Promise<Located> => {
  const target = await targetOf(deps, input);

  if (!(target instanceof Object)) {
    return { message: target, ok: false };
  }

  if (!target.source) {
    return { message: NO_SOURCE, ok: false };
  }

  return {
    ok: true,
    target: {
      selector: input.targetSelector ?? null,
      source: target.source,
      tag: target.tag ?? null,
    },
  };
};

const hasTarget = (input: z.output<typeof listSchema>): boolean =>
  Boolean(input.targetSelector) || Boolean(input.targetSource);

const listWith = async (
  deps: DirectToolDeps,
  input: z.output<typeof listSchema>
): Promise<ToolText> => {
  let located: SourceLoc | null = null;

  if (hasTarget(input)) {
    const found = await locate(deps, input);

    if (!found.ok) {
      return refuse(found.message);
    }

    located = found.target.source;
  }

  const frameList = await canvasFrames(deps);

  const result = await listBreakpoints(scopeOf(deps), {
    frame: input.frame ?? null,
    frames: frameList,
    source: located,
    width: input.width ?? null,
  });

  return reply(JSON.stringify(result, null, 2));
};

const runListBreakpoints = async (
  deps: DirectToolDeps,
  args: z.input<typeof listSchema>
): Promise<ToolText> => {
  const parsed = listSchema.safeParse(args);

  if (!parsed.success) {
    return issues("list_breakpoints", parsed.error);
  }

  if (parsed.data.targetSelector && parsed.data.targetSource) {
    return refuse("Pass targetSelector or targetSource, not both.");
  }

  try {
    return await listWith(deps, parsed.data);
  } catch (error) {
    return caught("list_breakpoints", error as Error | null);
  }
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
  const located = await locate(deps, input);

  if (!located.ok) {
    return refuse(located.message);
  }

  const plan = await planBreakpointStyle(scopeOf(deps), {
    input: toStyleInput(input),
    target: located.target,
  });

  const problem = await writeAll(deps, plan.written);

  if (problem) {
    return refuse(problem);
  }

  const result = JSON.stringify(toBreakpointResult(plan, null));

  return reply(`${plan.title}. ${RUN_NOTE} ${result}`);
};

const runSetBreakpointStyle = async (
  deps: DirectToolDeps,
  args: z.input<typeof setSchema>
): Promise<ToolText> => {
  const blocked = refusal(deps.ctx, "set_breakpoint_style");

  if (blocked) {
    return refuse(blocked);
  }

  const parsed = setSchema.safeParse(args);

  if (!parsed.success) {
    return issues("set_breakpoint_style", parsed.error);
  }

  if (
    Boolean(parsed.data.targetSelector) === Boolean(parsed.data.targetSource)
  ) {
    return refuse("Pass targetSelector or targetSource, not both.");
  }

  try {
    return await setWith(deps, parsed.data);
  } catch (error) {
    return caught("set_breakpoint_style", error as Error | null);
  }
};

export {
  listBreakpointsDescription,
  listBreakpointsInput,
  runListBreakpoints,
  runSetBreakpointStyle,
  setBreakpointStyleDescription,
  setBreakpointStyleInput,
};
