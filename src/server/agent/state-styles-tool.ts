import { z } from "zod";

import type { BreakpointScope } from "../breakpoints/commit.js";
import type { WrittenFile } from "../direct-edit/batch.js";
import { writeAtomic } from "../direct-edit/commit/edit-source.js";
import { DirectEditError } from "../direct-edit/engine/errors.js";
import { StateStyleError } from "../state-styles/errors.js";
import { forcedSummary, setForcedState } from "../state-styles/forced.js";
import {
  forcedStateFields,
  LIST_STATE_STYLES_DESCRIPTION,
  SET_FORCED_STATE_DESCRIPTION,
  SET_STATE_STYLE_DESCRIPTION,
  setStateFields,
  toStateInput,
} from "../state-styles/input.js";
import { listStateStyles } from "../state-styles/list.js";
import { planStateStyle, toStateResult } from "../state-styles/set.js";
import type { StateTarget } from "../state-styles/set.js";
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
  | { ok: true; target: StateTarget };

const SELECTOR_MAX = 2000;
const SOURCE_MAX = 1100;
const PATH_MAX = 300;

const RUN_NOTE =
  "The run saves this change in its version, like your file edits.";

const NO_SOURCE = "The layer has no source location. Pass targetSource.";

const ONE_TARGET = "Pass targetSelector or targetSource, not both.";

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

const listStateStylesInput = { ...targetInput };

const setStateStyleInput = { ...targetInput, ...setStateFields };

const setForcedStateInput = { ...forcedStateFields };

const listSchema = z.strictObject(listStateStylesInput);
const setSchema = z.strictObject(setStateStyleInput);
const forcedSchema = z.strictObject(setForcedStateInput);

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

const issues = (tool: string, error: z.ZodError): ToolText => {
  const lines = error.issues.map(
    (issue) => `${issue.path.join(".") || "input"}: ${issue.message}`
  );

  return refuse(`${tool}: ${lines.join("; ")}`);
};

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

const isOneTarget = (input: z.output<typeof listSchema>): boolean =>
  Boolean(input.targetSelector) !== Boolean(input.targetSource);

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

const listWith = async (
  deps: DirectToolDeps,
  input: z.output<typeof listSchema>
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
  args: z.input<typeof listSchema>
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
  input: z.output<typeof setSchema>
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
  args: z.input<typeof setSchema>
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
  input: z.output<typeof forcedSchema>
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
  args: z.input<typeof forcedSchema>
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
