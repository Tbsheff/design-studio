import { Schema } from "effect";

import type { SourceLoc } from "@design-studio/actions/_core/contracts";
import {
  toOptionalFlag,
  toOptionalInt,
  toOptionalText,
  toSdkFieldSet,
  toToolInput,
  toTrimmedText,
} from "../agent-tools/index.js";
import type { ToolArgs, ToolDecoded } from "../agent-tools/index.js";
import type { BreakpointScope } from "../breakpoints/commit.js";
import {
  BREAKPOINT_NAME,
  BREAKPOINT_VALUE_MAX,
  BREAKPOINT_WIDTH_MAX,
  DIRECT_STYLE_PROPERTIES,
} from "../breakpoints/deps.js";
import { BreakpointError } from "../breakpoints/errors.js";
import {
  LIST_BREAKPOINTS_DESCRIPTION,
  SET_BREAKPOINT_STYLE_DESCRIPTION,
  toStyleInput,
} from "../breakpoints/input.js";
import { listBreakpoints } from "../breakpoints/list.js";
import { planBreakpointStyle, toBreakpointResult } from "../breakpoints/set.js";
import type { BreakpointTarget } from "../breakpoints/set.js";
import type { WrittenFile } from "../direct-edit/commit/index.js";
import { writeAtomic } from "../direct-edit/commit/index.js";
import { DirectEditError } from "../direct-edit/engine/index.js";
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
const FRAME_MAX = 200;
const BREAKPOINT_NAME_MAX = 64;

const RUN_NOTE =
  "The run saves this change in its version, like your file edits.";

const NO_SOURCE = "The layer has no source location. Pass targetSource.";

const targetInput = {
  path: toOptionalText(
    0,
    PATH_MAX,
    "Page path. Leave out for the page of the frame in <canvas-context> (or the entry page)."
  ),
  targetSelector: toOptionalText(
    1,
    SELECTOR_MAX,
    "CSS selector or layer id of the layer on the live page."
  ),
  targetSource: toOptionalText(
    0,
    SOURCE_MAX,
    'Or the layer as file:line:col, for example "src/App.tsx:12:7".'
  ),
};

const listBreakpointFieldSet = {
  ...targetInput,
  frame: toOptionalText(
    1,
    FRAME_MAX,
    "Canvas frame id or label. Its width picks the active breakpoint."
  ),
  width: toOptionalInt(
    1,
    BREAKPOINT_WIDTH_MAX,
    "Or a frame width in px, for example 390 or 1440."
  ),
};

const setBreakpointFieldSet = {
  ...targetInput,
  breakpoint: toTrimmedText(0, BREAKPOINT_NAME_MAX)
    .check(Schema.isPattern(BREAKPOINT_NAME))
    .annotate({
      description: '"base" or a breakpoint name, for example "md" or "lg".',
    }),
  property: Schema.Literals(DIRECT_STYLE_PROPERTIES).annotate({
    description: "CSS property, for example padding-top, font-size or display.",
  }),
  reset: toOptionalFlag("Remove the value at this breakpoint. Default false."),
  value: toOptionalText(
    1,
    BREAKPOINT_VALUE_MAX,
    'CSS value, for example "24px", "1.25rem", "none" or "#0f172a".'
  ),
};

const listBreakpointsInput = toSdkFieldSet(listBreakpointFieldSet);

const setBreakpointStyleInput = toSdkFieldSet(setBreakpointFieldSet);

const listSchema = toToolInput(listBreakpointFieldSet);
const setSchema = toToolInput(setBreakpointFieldSet);

const listBreakpointsDescription = LIST_BREAKPOINTS_DESCRIPTION;

const setBreakpointStyleDescription = SET_BREAKPOINT_STYLE_DESCRIPTION;

const reply = (message: string): ToolText => ({
  content: [{ text: message, type: "text" }],
});

const refuse = (message: string): ToolText => ({
  content: [{ text: message, type: "text" }],
  isError: true,
});

const issues = (tool: string, error: string): ToolText =>
  refuse(`${tool}: ${error}`);

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
  input: ToolDecoded<typeof listSchema>
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

const hasTarget = (input: ToolDecoded<typeof listSchema>): boolean =>
  Boolean(input.targetSelector) || Boolean(input.targetSource);

const listWith = async (
  deps: DirectToolDeps,
  input: ToolDecoded<typeof listSchema>
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
  args: ToolArgs<typeof listSchema>
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
  input: ToolDecoded<typeof setSchema>
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
  args: ToolArgs<typeof setSchema>
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
