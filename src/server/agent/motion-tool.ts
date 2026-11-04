import { Schema } from "effect";

import {
  ENTRANCE_PRESETS,
  MOTION_DELAY_MAX,
  MOTION_DURATION_MAX,
  MOTION_KINDS,
  MOTION_PROPERTIES_MAX,
  MOTION_PROPERTY,
  MOTION_STAGGER_MAX,
  MOTION_STATES,
  MOTION_VALUE,
} from "../../shared/motion.js";
import { toSdkFieldSet } from "../agent-tools/sdk-shape.js";
import type { WrittenFile } from "../direct-edit/commit/batch.js";
import { writeAtomic } from "../direct-edit/index.js";
import { listMotion } from "../motion/list.js";
import { planMotionSet } from "../motion/set.js";
import type { MotionSetPlan, MotionTarget } from "../motion/set.js";
import { specOf } from "../motion/spec.js";
import { refusal, writeProblem } from "./direct-tools.js";
import type { DirectToolDeps } from "./direct-tools.js";
import { targetOf } from "./insert-tool.js";
import {
  toOptional,
  toOptionalInt,
  toOptionalText,
  toToolInput,
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
  | { ok: true; target: MotionTarget };

const SELECTOR_MAX = 2000;
const SOURCE_MAX = 1100;
const PATH_MAX = 300;
const EASING_MAX = 80;

const RUN_NOTE =
  "The run saves this change in its version, like your file edits.";

const targetInput = {
  path: toOptionalText(
    0,
    PATH_MAX,
    "Page path. Leave out for the page of the frame in <canvas-context> (or the entry page)."
  ),
  targetSelector: toOptionalText(
    1,
    SELECTOR_MAX,
    "CSS selector or layer id of the element on the live page."
  ),
  targetSource: toOptionalText(
    0,
    SOURCE_MAX,
    'Or the element as file:line:col, for example "src/App.tsx:12:7".'
  ),
};

const propertyName = Schema.String.check(Schema.isPattern(MOTION_PROPERTY));

const endRecord = Schema.Record(
  propertyName,
  Schema.String.check(Schema.isPattern(MOTION_VALUE))
);

const propertyList = Schema.Array(propertyName).check(
  Schema.isMaxLength(MOTION_PROPERTIES_MAX)
);

const motionFields = {
  delayMs: toOptionalInt(
    0,
    MOTION_DELAY_MAX,
    "Delay before the motion starts, in ms. Default 0."
  ),
  durationMs: toOptionalInt(
    0,
    MOTION_DURATION_MAX,
    "Duration in ms. Default 200 for a transition and 400 for an entrance."
  ),
  easing: toOptionalText(
    0,
    EASING_MAX,
    'Transition easing: linear, ease, ease-in, ease-out (default), ease-in-out or "cubic-bezier(0.4,0,0.2,1)".'
  ),
  end: toOptional(
    endRecord,
    'Transition end values for state, for example {"opacity": "0.8", "transform": "translateY(-2px)"}.'
  ),
  kind: Schema.Literals(MOTION_KINDS).annotate({
    description:
      "transition (state change), entrance (on mount) or none (remove motion).",
  }),
  preset: toOptional(
    Schema.Literals(ENTRANCE_PRESETS),
    "Entrance preset. Default fade."
  ),
  properties: toOptional(
    propertyList,
    'CSS properties to transition, or ["all"]. Default: the end keys, else opacity and transform.'
  ),
  staggerMs: toOptionalInt(
    0,
    MOTION_STAGGER_MAX,
    "Entrance only: extra delay for each child, in ms, so the children enter one after another. Default 0."
  ),
  state: toOptional(
    Schema.Literals(MOTION_STATES),
    "Transition only: the state whose end values the element animates to."
  ),
};

const listMotionFields = { ...targetInput };

const setMotionFields = { ...targetInput, ...motionFields };

const listMotionInput = toSdkFieldSet(listMotionFields);

const setMotionInput = toSdkFieldSet(setMotionFields);

const listSchema = toToolInput(listMotionFields);
const setSchema = toToolInput(setMotionFields);

const reply = (message: string): ToolText => ({
  content: [{ text: message, type: "text" }],
});

const refuse = (message: string): ToolText => ({
  content: [{ text: message, type: "text" }],
  isError: true,
});

const issues = (tool: string, error: string): ToolText =>
  refuse(`${tool}: ${error}`);

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
  input: ToolData<typeof listSchema>
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
  input: ToolData<typeof listSchema>
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
  args: ToolArgs<typeof listSchema>
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
  input: ToolData<typeof setSchema>
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
  args: ToolArgs<typeof setSchema>
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
