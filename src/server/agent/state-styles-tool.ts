import { Schema } from "effect";

import { toSdkFieldSet } from "../agent-tools/sdk-shape.js";
import type { BreakpointScope } from "../breakpoints/commit.js";
import type { WrittenFile } from "../direct-edit/commit/batch.js";
import { writeAtomic } from "../direct-edit/commit/edit-source.js";
import { DirectEditError } from "../direct-edit/engine/errors.js";
import {
  BREAKPOINT_NAME,
  BREAKPOINT_VALUE_MAX,
  DIRECT_STYLE_PROPERTIES,
  STATE_SELECTOR_MAX,
  STYLE_STATES,
} from "../state-styles/deps.js";
import { StateStyleError } from "../state-styles/errors.js";
import { forcedSummary, setForcedState } from "../state-styles/forced.js";
import {
  LIST_STATE_STYLES_DESCRIPTION,
  SET_FORCED_STATE_DESCRIPTION,
  SET_STATE_STYLE_DESCRIPTION,
  toStateInput,
} from "../state-styles/input.js";
import { listStateStyles } from "../state-styles/list.js";
import { planStateStyle, toStateResult } from "../state-styles/set.js";
import type { StateTarget } from "../state-styles/set.js";
import { canvasFrames, refusal, writeProblem } from "./direct-tools.js";
import type { DirectToolDeps } from "./direct-tools.js";
import { targetOf } from "./insert-tool.js";
import {
  toOptionalFlag,
  toOptionalText,
  toToolInput,
  toTrimmedText,
} from "./tool-input.js";
import type { ToolArgs, ToolData } from "./tool-input.js";

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
  | { ok: true; target: StateTarget };

const SELECTOR_MAX = 2000;
const SOURCE_MAX = 1100;
const PATH_MAX = 300;

const RUN_NOTE =
  "The run saves this change in its version, like your file edits.";

const NO_SOURCE = "The layer has no source location. Pass targetSource.";

const ONE_TARGET = "Pass targetSelector or targetSource, not both.";

const FRAME_MAX = 60;
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

const stateLiteral = Schema.Literals(STYLE_STATES);

const listStateStylesFields = { ...targetInput };

const setStateStyleFields = {
  ...targetInput,
  breakpoint: Schema.optionalKey(
    toTrimmedText(0, BREAKPOINT_NAME_MAX)
      .check(Schema.isPattern(BREAKPOINT_NAME))
      .annotate({
        description: '"base" (default) or a breakpoint name, for example "md".',
      })
  ),
  property: Schema.Literals(DIRECT_STYLE_PROPERTIES).annotate({
    description: "CSS property, for example background-color or color.",
  }),
  reset: toOptionalFlag("Remove the value in this state. Default false."),
  state: stateLiteral.annotate({
    description: "hover, focus-visible, active, disabled or dark.",
  }),
  value: toOptionalText(
    1,
    BREAKPOINT_VALUE_MAX,
    'CSS value, for example "#0f172a" or "0.9".'
  ),
};

const setForcedStateFields = {
  frameId: toTrimmedText(1, FRAME_MAX).annotate({
    description: "Canvas frame id or @label from canvas_list.",
  }),
  layer: Schema.optionalKey(
    Schema.NullOr(toTrimmedText(1, STATE_SELECTOR_MAX)).annotate({
      description: "CSS selector of the layer. null or leave out for dark.",
    })
  ),
  state: Schema.NullOr(stateLiteral).annotate({
    description: "The state to show, or null to show the frame as it is.",
  }),
};

const listStateStylesInput = toSdkFieldSet(listStateStylesFields);

const setStateStyleInput = toSdkFieldSet(setStateStyleFields);

const setForcedStateInput = toSdkFieldSet(setForcedStateFields);

const listSchema = toToolInput(listStateStylesFields);
const setSchema = toToolInput(setStateStyleFields);
const forcedSchema = toToolInput(setForcedStateFields);

const listStateStylesDescription = LIST_STATE_STYLES_DESCRIPTION;

const setStateStyleDescription = SET_STATE_STYLE_DESCRIPTION;

const setForcedStateDescription = SET_FORCED_STATE_DESCRIPTION;

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
  if (error instanceof StateStyleError || error instanceof DirectEditError) {
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

const isOneTarget = (input: ToolData<typeof listSchema>): boolean =>
  Boolean(input.targetSelector) !== Boolean(input.targetSource);

const locate = async (
  deps: DirectToolDeps,
  input: ToolData<typeof listSchema>
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

const listWith = async (
  deps: DirectToolDeps,
  input: ToolData<typeof listSchema>
): Promise<ToolText> => {
  const located = await locate(deps, input);

  if (!located.ok) {
    return refuse(located.message);
  }

  const result = await listStateStyles(scopeOf(deps), located.target.source);

  return reply(JSON.stringify(result, null, 2));
};

const runListStateStyles = async (
  deps: DirectToolDeps,
  args: ToolArgs<typeof listSchema>
): Promise<ToolText> => {
  const parsed = listSchema.safeParse(args);

  if (!parsed.success) {
    return issues("list_state_styles", parsed.error);
  }

  if (!isOneTarget(parsed.data)) {
    return refuse(ONE_TARGET);
  }

  try {
    return await listWith(deps, parsed.data);
  } catch (error) {
    return caught("list_state_styles", error as Error | null);
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
  input: ToolData<typeof setSchema>
): Promise<ToolText> => {
  const located = await locate(deps, input);

  if (!located.ok) {
    return refuse(located.message);
  }

  const plan = await planStateStyle(scopeOf(deps), {
    input: toStateInput(input),
    target: located.target,
  });

  const problem = await writeAll(deps, plan.written);

  if (problem) {
    return refuse(problem);
  }

  const result = JSON.stringify(toStateResult(plan, null));

  return reply(`${plan.title}. ${RUN_NOTE} ${result}`);
};

const runSetStateStyle = async (
  deps: DirectToolDeps,
  args: ToolArgs<typeof setSchema>
): Promise<ToolText> => {
  const blocked = refusal(deps.ctx, "set_state_style");

  if (blocked) {
    return refuse(blocked);
  }

  const parsed = setSchema.safeParse(args);

  if (!parsed.success) {
    return issues("set_state_style", parsed.error);
  }

  if (!isOneTarget(parsed.data)) {
    return refuse(ONE_TARGET);
  }

  try {
    return await setWith(deps, parsed.data);
  } catch (error) {
    return caught("set_state_style", error as Error | null);
  }
};

const forcedWith = async (
  deps: DirectToolDeps,
  input: ToolData<typeof forcedSchema>
): Promise<ToolText> => {
  const frameList = await canvasFrames(deps);

  const forced = setForcedState({
    frameId: input.frameId,
    frames: frameList,
    layer: input.layer ?? null,
    projectId: deps.ctx.project.id,
    state: input.state,
  });

  return reply(forcedSummary(forced));
};

const runSetForcedState = async (
  deps: DirectToolDeps,
  args: ToolArgs<typeof forcedSchema>
): Promise<ToolText> => {
  const parsed = forcedSchema.safeParse(args);

  if (!parsed.success) {
    return issues("set_forced_state", parsed.error);
  }

  try {
    return await forcedWith(deps, parsed.data);
  } catch (error) {
    return caught("set_forced_state", error as Error | null);
  }
};

export {
  listStateStylesDescription,
  listStateStylesInput,
  runListStateStyles,
  runSetForcedState,
  runSetStateStyle,
  setForcedStateDescription,
  setForcedStateInput,
  setStateStyleDescription,
  setStateStyleInput,
};
