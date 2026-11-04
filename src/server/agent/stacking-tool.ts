import { z } from "zod";

import type { BreakpointScope } from "../breakpoints/commit.js";
import type { WrittenFile } from "../direct-edit/commit/batch.js";
import { writeAtomic } from "../direct-edit/commit/edit-source.js";
import { DirectEditError } from "../direct-edit/engine/errors.js";
import { StackingError } from "../stacking/errors.js";
import { getStacking } from "../stacking/get.js";
import {
  GET_STACKING_DESCRIPTION,
  getStackingFields,
  SET_STACKING_DESCRIPTION,
  setStackingFields,
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

const getStackingInput = { ...targetInput, ...getStackingFields };

const setStackingInput = { ...targetInput, ...setStackingFields };

const getSchema = z.strictObject(getStackingInput);
const setSchema = z.strictObject(setStackingInput);

const getStackingDescription = GET_STACKING_DESCRIPTION;

const setStackingDescription = SET_STACKING_DESCRIPTION;

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

const hasOneTarget = (input: z.output<typeof getSchema>): boolean =>
  Boolean(input.targetSelector) !== Boolean(input.targetSource);

const locate = async (
  deps: DirectToolDeps,
  input: z.output<typeof getSchema>
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
  input: z.output<typeof getSchema>
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
  args: z.input<typeof getSchema>
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
  input: z.output<typeof setSchema>
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
  args: z.input<typeof setSchema>
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
