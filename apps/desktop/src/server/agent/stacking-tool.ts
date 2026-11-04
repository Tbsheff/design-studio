import { Schema } from "effect";

import {
  toOptionalText,
  toSdkFieldSet,
  toToolInput,
  toTrimmedText,
} from "../agent-tools/index.js";
import type { ToolArgs, ToolDecoded } from "../agent-tools/index.js";
import type { BreakpointScope } from "../breakpoints/commit.js";
import type { WrittenFile } from "../direct-edit/commit/index.js";
import { writeAtomic } from "../direct-edit/commit/index.js";
import { DirectEditError } from "../direct-edit/engine/index.js";
import {
  BREAKPOINT_NAME,
  STACKING_OVERFLOWS,
  STACKING_POSITIONS,
  STACKING_VALUE_MAX,
} from "../stacking/deps.js";
import { StackingError } from "../stacking/errors.js";
import { getStacking } from "../stacking/get.js";
import {
  GET_STACKING_DESCRIPTION,
  SET_STACKING_DESCRIPTION,
  toStackingInput,
} from "../stacking/input.js";
import { planStacking, toStackingResult } from "../stacking/set.js";
import type { StackingTarget } from "../stacking/set.js";
import { refusal, writeProblem } from "./direct-tools.js";
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
  | { ok: true; target: StackingTarget };

const SELECTOR_MAX = 2000;
const SOURCE_MAX = 1100;
const PATH_MAX = 300;

const RUN_NOTE =
  "The run saves this change in its version, like your file edits.";

const NO_SOURCE = "The layer has no source location. Pass targetSource.";

const ONE_TARGET = "Pass targetSelector or targetSource, not both.";

const NO_CHANGE =
  "Pass at least one of position, top, right, bottom, left, overflow, overflowX, overflowY or zIndex.";

const BREAKPOINT_NAME_MAX = 64;

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

const toOffset = (
  description: string
): Schema.optionalKey<Schema.NullOr<Schema.Trim>> =>
  Schema.optionalKey(
    Schema.NullOr(toTrimmedText(1, STACKING_VALUE_MAX)).annotate({
      description,
    })
  );

const toOverflow = (
  description: string
): Schema.optionalKey<
  Schema.NullOr<Schema.Literals<typeof STACKING_OVERFLOWS>>
> =>
  Schema.optionalKey(
    Schema.NullOr(Schema.Literals(STACKING_OVERFLOWS)).annotate({ description })
  );

const breakpointField = Schema.optionalKey(
  toTrimmedText(0, BREAKPOINT_NAME_MAX)
    .check(Schema.isPattern(BREAKPOINT_NAME))
    .annotate({
      description: '"base" (default) or a breakpoint name, for example "md".',
    })
);

const getStackingFieldSet = { ...targetInput, breakpoint: breakpointField };

const setStackingFieldSet = {
  ...targetInput,
  bottom: toOffset("Bottom offset, for example 0 or 16px. null removes it."),
  breakpoint: breakpointField,
  left: toOffset("Left offset, for example 0 or 16px. null removes it."),
  overflow: toOverflow("Overflow for both axes. null removes it."),
  overflowX: toOverflow("Overflow on the x axis. null removes it."),
  overflowY: toOverflow(
    "Overflow on the y axis, for example auto. null removes it."
  ),
  position: Schema.optionalKey(
    Schema.NullOr(Schema.Literals(STACKING_POSITIONS)).annotate({
      description: "Position, for example sticky. null removes it.",
    })
  ),
  right: toOffset("Right offset, for example 0 or 16px. null removes it."),
  top: toOffset("Top offset, for example 0 or 16px. null removes it."),
  zIndex: toOffset(
    'z-index: an integer, "auto" or a project token like "--z-header". null removes it.'
  ),
};

const getStackingInput = toSdkFieldSet(getStackingFieldSet);

const setStackingInput = toSdkFieldSet(setStackingFieldSet);

const getStackingDescription = GET_STACKING_DESCRIPTION;
const setStackingDescription = SET_STACKING_DESCRIPTION;

const getSchema = toToolInput(getStackingFieldSet);
const setSchema = toToolInput(setStackingFieldSet);

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
  if (error instanceof StackingError || error instanceof DirectEditError) {
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

const hasOneTarget = (input: ToolDecoded<typeof getSchema>): boolean =>
  Boolean(input.targetSelector) !== Boolean(input.targetSource);

const locate = async (
  deps: DirectToolDeps,
  input: ToolDecoded<typeof getSchema>
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

const getWith = async (
  deps: DirectToolDeps,
  input: ToolDecoded<typeof getSchema>
): Promise<ToolText> => {
  const located = await locate(deps, input);

  if (!located.ok) {
    return refuse(located.message);
  }

  const result = await getStacking(scopeOf(deps), {
    breakpoint: input.breakpoint ?? "base",
    source: located.target.source,
  });

  return reply(JSON.stringify(result, null, 2));
};

const runGetStacking = async (
  deps: DirectToolDeps,
  args: ToolArgs<typeof getSchema>
): Promise<ToolText> => {
  const parsed = getSchema.safeParse(args);

  if (!parsed.success) {
    return issues("get_stacking", parsed.error);
  }

  if (!hasOneTarget(parsed.data)) {
    return refuse(ONE_TARGET);
  }

  try {
    return await getWith(deps, parsed.data);
  } catch (error) {
    return caught("get_stacking", error as Error | null);
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
  const stacking = toStackingInput(input);

  if (stacking === null) {
    return refuse(NO_CHANGE);
  }

  const located = await locate(deps, input);

  if (!located.ok) {
    return refuse(located.message);
  }

  const plan = await planStacking(scopeOf(deps), {
    input: stacking,
    target: located.target,
  });

  const problem = await writeAll(deps, plan.written);

  if (problem) {
    return refuse(problem);
  }

  const result = JSON.stringify(toStackingResult(plan, null));

  return reply(`${plan.title}. ${RUN_NOTE} ${result}`);
};

const runSetStacking = async (
  deps: DirectToolDeps,
  args: ToolArgs<typeof setSchema>
): Promise<ToolText> => {
  const blocked = refusal(deps.ctx, "set_stacking");

  if (blocked) {
    return refuse(blocked);
  }

  const parsed = setSchema.safeParse(args);

  if (!parsed.success) {
    return issues("set_stacking", parsed.error);
  }

  if (!hasOneTarget(parsed.data)) {
    return refuse(ONE_TARGET);
  }

  try {
    return await setWith(deps, parsed.data);
  } catch (error) {
    return caught("set_stacking", error as Error | null);
  }
};

export {
  getStackingDescription,
  getStackingInput,
  runGetStacking,
  runSetStacking,
  setStackingDescription,
  setStackingInput,
};
