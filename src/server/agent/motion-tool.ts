import { z } from "zod";

import type { WrittenFile } from "../direct-edit/commit/batch.js";
import { writeAtomic } from "../direct-edit/index.js";
import { motionFields } from "../mcp/motion-tools.js";
import { listMotion } from "../motion/list.js";
import { planMotionSet } from "../motion/set.js";
import type { MotionSetPlan, MotionTarget } from "../motion/set.js";
import { specOf } from "../motion/spec.js";
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
  | { ok: true; target: MotionTarget };

const SELECTOR_MAX = 2000;
const SOURCE_MAX = 1100;
const PATH_MAX = 300;

const RUN_NOTE =
  "The run saves this change in its version, like your file edits.";

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
    .describe("CSS selector or layer id of the element on the live page."),
  targetSource: z
    .string()
    .trim()
    .max(SOURCE_MAX)
    .optional()
    .describe(
      'Or the element as file:line:col, for example "src/App.tsx:12:7".'
    ),
};

const listMotionInput = { ...targetInput };

const setMotionInput = { ...targetInput, ...motionFields };

const listSchema = z.strictObject(listMotionInput);
const setSchema = z.strictObject(setMotionInput);

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

const failure = (tool: string, error: Error | string): ToolText => {
  if (error instanceof Error) {
    return refuse(`${tool} failed: ${error.message}`);
  }

  return refuse(`${tool} failed: ${error}`);
};

const caught = (tool: string, error: Error | string | null): ToolText => {
  if (error instanceof Error) {
    return failure(tool, error);
  }

  return failure(tool, String(error));
};

const oneTarget = (input: {
  targetSelector?: string | undefined;
  targetSource?: string | undefined;
}): boolean => Boolean(input.targetSelector) !== Boolean(input.targetSource);

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

const classText = (plan: MotionSetPlan): string => {
  if (!plan.classes) {
    return "";
  }

  const added = plan.classes.add.join(" ") || "none";
  const removed = plan.classes.remove.join(" ") || "none";

  return ` (added ${added}, removed ${removed})`;
};

const setText = (plan: MotionSetPlan): string => {
  const files = plan.written.map((entry) => entry.target.relative).join(", ");

  return `${plan.title} in ${files}${classText(plan)}. ${RUN_NOTE}`;
};

const sourceOf = async (
  deps: DirectToolDeps,
  input: z.output<typeof listSchema>
): Promise<Located> => {
  const target = await targetOf(deps, input);

  if (!(target instanceof Object)) {
    return { message: target, ok: false };
  }

  if (!target.source) {
    return {
      message: "The element has no source location. Pass targetSource.",
      ok: false,
    };
  }

  return {
    ok: true,
    target: {
      selector: input.targetSelector,
      source: target.source,
      tag: target.tag,
    },
  };
};

const listWith = async (
  deps: DirectToolDeps,
  input: z.output<typeof listSchema>
): Promise<ToolText> => {
  const located = await sourceOf(deps, input);

  if (!located.ok) {
    return refuse(located.message);
  }

  const { direction, project } = deps.ctx;

  const info = await listMotion(
    { project, workTree: direction.workTree },
    located.target.source
  );

  return reply(JSON.stringify(info, null, 2));
};

const runListMotion = async (
  deps: DirectToolDeps,
  args: z.input<typeof listSchema>
): Promise<ToolText> => {
  const parsed = listSchema.safeParse(args);

  if (!parsed.success) {
    return issues("list_motion", parsed.error);
  }

  if (!oneTarget(parsed.data)) {
    return refuse("Pass targetSelector or targetSource, not both.");
  }

  try {
    return await listWith(deps, parsed.data);
  } catch (error) {
    return caught("list_motion", error as Error | null);
  }
};

const setWith = async (
  deps: DirectToolDeps,
  input: z.output<typeof setSchema>
): Promise<ToolText> => {
  const located = await sourceOf(deps, input);

  if (!located.ok) {
    return refuse(located.message);
  }

  const { direction, project } = deps.ctx;

  const plan = await planMotionSet(
    { project, workTree: direction.workTree },
    { spec: specOf(input), target: located.target }
  );

  const problem = await writeAll(deps, plan.written);

  if (problem) {
    return refuse(problem);
  }

  return reply(setText(plan));
};

const runSetMotion = async (
  deps: DirectToolDeps,
  args: z.input<typeof setSchema>
): Promise<ToolText> => {
  const blocked = refusal(deps.ctx, "set_motion");

  if (blocked) {
    return refuse(blocked);
  }

  const parsed = setSchema.safeParse(args);

  if (!parsed.success) {
    return issues("set_motion", parsed.error);
  }

  if (!oneTarget(parsed.data)) {
    return refuse("Pass targetSelector or targetSource, not both.");
  }

  try {
    return await setWith(deps, parsed.data);
  } catch (error) {
    return caught("set_motion", error as Error | null);
  }
};

export { listMotionInput, runListMotion, runSetMotion, setMotionInput };
