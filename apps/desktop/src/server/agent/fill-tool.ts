import { Schema } from "effect";

import {
  BLEND_MODES,
  BLEND_PROPERTIES,
  FILL_ANGLE_MAX,
  FILL_AT,
  FILL_COLOR,
  FILL_STOPS_MAX,
  FILL_STOPS_MIN,
  FILL_TOKEN,
  FILL_TYPES,
  RADIAL_FORMS,
} from "../../shared/fill.js";
import {
  toOptionalText,
  toSdkFieldSet,
  toToolInput,
  toTrimmedText,
} from "../agent-tools/index.js";
import type { ToolArgs, ToolDecoded } from "../agent-tools/index.js";
import type { WrittenFile } from "../direct-edit/commit/index.js";
import { writeAtomic } from "../direct-edit/index.js";
import { getFill } from "../fill/get.js";
import { planFillSet } from "../fill/set.js";
import type { FillSetPlan, FillTarget } from "../fill/set.js";
import type { FillInput } from "../fill/spec.js";
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
  | { ok: true; target: FillTarget };

const SELECTOR_MAX = 2000;
const SOURCE_MAX = 1100;
const PERCENT_MAX = 100;
const FILL_TEXT_MAX = 200;
const PATH_MAX = 300;

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

const colorField = Schema.optionalKey(
  toTrimmedText(0, FILL_TEXT_MAX).check(Schema.isPattern(FILL_COLOR)).annotate({
    description: 'CSS color, for example "#2563eb" or "oklch(0.6 0.2 260)".',
  })
);

const tokenField = Schema.optionalKey(
  toTrimmedText(0, FILL_TEXT_MAX).check(Schema.isPattern(FILL_TOKEN)).annotate({
    description:
      'Color token name, for example "primary" or "--color-primary".',
  })
);

const percentRange = Schema.isBetween({ maximum: PERCENT_MAX, minimum: 0 });

const percentValue = Schema.Finite.check(percentRange);

const stop = Schema.Struct({
  color: colorField,
  position: Schema.optionalKey(
    percentValue.annotate({ description: "Stop position in %." })
  ),
  token: tokenField,
});

const fillFields = {
  angle: Schema.optionalKey(
    Schema.Finite.check(
      Schema.isBetween({ maximum: FILL_ANGLE_MAX, minimum: -FILL_ANGLE_MAX })
    ).annotate({
      description:
        "Linear only: angle in degrees. 0 is to top, 90 to right. Default 180.",
    })
  ),
  at: Schema.optionalKey(
    toTrimmedText(0, FILL_TEXT_MAX).check(Schema.isPattern(FILL_AT)).annotate({
      description:
        'Radial only: center, for example "center", "top left" or "25% 75%".',
    })
  ),
  blendMode: Schema.optionalKey(
    Schema.Literals(BLEND_MODES).annotate({
      description: "Blend mode, for example multiply, screen or overlay.",
    })
  ),
  blendProperty: Schema.optionalKey(
    Schema.Literals(BLEND_PROPERTIES).annotate({
      description:
        "mix-blend-mode (blend the element with what is under it, default) or background-blend-mode (blend the background layers).",
    })
  ),
  color: colorField,
  form: Schema.optionalKey(
    Schema.Literals(RADIAL_FORMS).annotate({
      description: "Radial only: circle or ellipse. Default ellipse.",
    })
  ),
  stops: Schema.optionalKey(
    Schema.Array(stop)
      .check(
        Schema.isMinLength(FILL_STOPS_MIN),
        Schema.isMaxLength(FILL_STOPS_MAX)
      )
      .annotate({
        description: `Gradient stops (${FILL_STOPS_MIN}-${FILL_STOPS_MAX}): each {color | token, position %}.`,
      })
  ),
  token: tokenField,
  type: Schema.Literals(FILL_TYPES).annotate({
    description: "solid (color or token), linear or radial (stops).",
  }),
};

const getFillFields = { ...targetInput };

const setFillFields = { ...targetInput, ...fillFields };

const getFillInput = toSdkFieldSet(getFillFields);

const setFillInput = toSdkFieldSet(setFillFields);

const listSchema = toToolInput(getFillFields);
const setSchema = toToolInput(setFillFields);

const fillInputOf = (input: ToolDecoded<typeof setSchema>): FillInput => ({
  angle: input.angle,
  at: input.at,
  blendMode: input.blendMode,
  blendProperty: input.blendProperty,
  color: input.color,
  form: input.form,
  stops: input.stops,
  token: input.token,
  type: input.type,
});

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

const classText = (plan: FillSetPlan): string => {
  if (!plan.classes) {
    return "";
  }

  const added = plan.classes.add.join(" ") || "none";
  const removed = plan.classes.remove.join(" ") || "none";

  return ` (added ${added}, removed ${removed})`;
};

const setText = (plan: FillSetPlan): string => {
  const files = plan.written.map((entry) => entry.target.relative).join(", ");

  return `${plan.title} in ${files}${classText(plan)}. ${RUN_NOTE}`;
};

const sourceOf = async (
  deps: DirectToolDeps,
  input: ToolDecoded<typeof listSchema>
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
  input: ToolDecoded<typeof listSchema>
): Promise<ToolText> => {
  const located = await sourceOf(deps, input);

  if (!located.ok) {
    return refuse(located.message);
  }

  const { direction, project } = deps.ctx;

  const info = await getFill(
    { direction, project, workTree: direction.workTree },
    located.target.source
  );

  return reply(JSON.stringify(info, null, 2));
};

const runGetFill = async (
  deps: DirectToolDeps,
  args: ToolArgs<typeof listSchema>
): Promise<ToolText> => {
  const parsed = listSchema.safeParse(args);

  if (!parsed.success) {
    return issues("get_fill", parsed.error);
  }

  if (!oneTarget(parsed.data)) {
    return refuse("Pass targetSelector or targetSource, not both.");
  }

  try {
    return await listWith(deps, parsed.data);
  } catch (error) {
    return caught("get_fill", error as Error | null);
  }
};

const setWith = async (
  deps: DirectToolDeps,
  input: ToolDecoded<typeof setSchema>
): Promise<ToolText> => {
  const located = await sourceOf(deps, input);

  if (!located.ok) {
    return refuse(located.message);
  }

  const { direction, project } = deps.ctx;

  const plan = await planFillSet(
    { direction, project, workTree: direction.workTree },
    { input: fillInputOf(input), target: located.target }
  );

  const problem = await writeAll(deps, plan.written);

  if (problem) {
    return refuse(problem);
  }

  return reply(setText(plan));
};

const runSetFill = async (
  deps: DirectToolDeps,
  args: ToolArgs<typeof setSchema>
): Promise<ToolText> => {
  const blocked = refusal(deps.ctx, "set_fill");

  if (blocked) {
    return refuse(blocked);
  }

  const parsed = setSchema.safeParse(args);

  if (!parsed.success) {
    return issues("set_fill", parsed.error);
  }

  if (!oneTarget(parsed.data)) {
    return refuse("Pass targetSelector or targetSource, not both.");
  }

  try {
    return await setWith(deps, parsed.data);
  } catch (error) {
    return caught("set_fill", error as Error | null);
  }
};

export { getFillInput, runGetFill, runSetFill, setFillInput };
