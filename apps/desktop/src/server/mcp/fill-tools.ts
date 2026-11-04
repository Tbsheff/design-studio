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
import type { FillEditScope } from "../fill/commit.js";
import { FillError } from "../fill/errors.js";
import { getFill } from "../fill/get.js";
import { setFill } from "../fill/set.js";
import type { FillSetDone } from "../fill/set.js";
import type { FillInput } from "../fill/spec.js";
import { z } from "../platform/zod-bridge/index.js";
import { EditError, loadTarget, refuseWhileRunning } from "./edit-guards.js";
import type { EditDeps } from "./edit-guards.js";
import {
  defineTool,
  directionId as directionIdSchema,
  ok,
  pagePath,
  plain,
  projectId as projectIdSchema,
  selector,
  versionActivity,
} from "./edit-kit.js";
import type { Done } from "./edit-kit.js";
import { targetOf } from "./insert-tools.js";

const SOURCE_MAX = 1100;

const PERCENT_MAX = 100;

const colorField = z
  .string()
  .trim()
  .regex(FILL_COLOR)
  .optional()
  .describe('CSS color, for example "#2563eb" or "oklch(0.6 0.2 260)".');

const tokenField = z
  .string()
  .trim()
  .regex(FILL_TOKEN)
  .optional()
  .describe('Color token name, for example "primary" or "--color-primary".');

const stop = z.strictObject({
  color: colorField,
  position: z
    .number()
    .min(0)
    .max(PERCENT_MAX)
    .optional()
    .describe("Stop position in %."),
  token: tokenField,
});

const targetFields = {
  targetSelector: selector
    .optional()
    .describe("CSS selector or layer id of the element."),
  targetSource: z
    .string()
    .trim()
    .max(SOURCE_MAX)
    .optional()
    .describe(
      "Or the element as file:line:col of its tag, as get_layers prints it."
    ),
};

const fillFields = {
  angle: z
    .number()
    .min(-FILL_ANGLE_MAX)
    .max(FILL_ANGLE_MAX)
    .optional()
    .describe(
      "Linear only: angle in degrees. 0 is to top, 90 to right. Default 180."
    ),
  at: z
    .string()
    .trim()
    .regex(FILL_AT)
    .optional()
    .describe(
      'Radial only: center, for example "center", "top left" or "25% 75%".'
    ),
  blendMode: z
    .enum(BLEND_MODES)
    .optional()
    .describe("Blend mode, for example multiply, screen or overlay."),
  blendProperty: z
    .enum(BLEND_PROPERTIES)
    .optional()
    .describe(
      "mix-blend-mode (blend the element with what is under it, default) or background-blend-mode (blend the background layers)."
    ),
  color: colorField,
  form: z
    .enum(RADIAL_FORMS)
    .optional()
    .describe("Radial only: circle or ellipse. Default ellipse."),
  stops: z
    .array(stop)
    .min(FILL_STOPS_MIN)
    .max(FILL_STOPS_MAX)
    .optional()
    .describe(
      `Gradient stops (${FILL_STOPS_MIN}-${FILL_STOPS_MAX}): each {color | token, position %}.`
    ),
  token: tokenField,
  type: z
    .enum(FILL_TYPES)
    .describe("solid (color or token), linear or radial (stops)."),
};

const oneTarget = (input: {
  targetSelector?: string | undefined;
  targetSource?: string | undefined;
}): boolean => Boolean(input.targetSelector) !== Boolean(input.targetSource);

const TARGET_RULE = "pass targetSelector or targetSource, not both";

const getSchema = z
  .strictObject({
    directionId: directionIdSchema,
    path: pagePath,
    projectId: projectIdSchema,
    ...targetFields,
  })
  .refine(oneTarget, TARGET_RULE);

const setSchema = z
  .strictObject({
    directionId: directionIdSchema,
    path: pagePath,
    projectId: projectIdSchema,
    ...targetFields,
    ...fillFields,
  })
  .refine(oneTarget, TARGET_RULE);

type GetInput = z.output<typeof getSchema>;

type SetInput = z.output<typeof setSchema>;

const fillInputOf = (input: SetInput): FillInput => ({
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

const editScope = async (
  deps: EditDeps,
  projectId: string,
  directionId?: string
): Promise<FillEditScope> => {
  const found = await loadTarget(deps, projectId, directionId);

  refuseWhileRunning(deps, found.project, found.direction);

  return {
    direction: found.direction,
    project: found.project,
    workTree: found.direction.workTree,
  };
};

const guarded = async <Result>(
  work: () => Promise<Result>
): Promise<Result> => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof FillError) {
      throw new EditError(error.message);
    }

    throw error;
  }
};

const NO_SOURCE = "The element has no source location. Pass targetSource.";

const setReply = (scope: FillEditScope, done: FillSetDone): Done => {
  const { plan, version } = done;

  return {
    activity: versionActivity(
      scope.project,
      scope.direction,
      plan.title,
      version
    ),
    result: ok({
      blend: plan.blend,
      classes: plan.classes,
      files: plan.written.map((entry) => entry.target.relative),
      fill: plan.fill,
      mode: plan.mode,
      title: version.title,
      versionId: version.id,
    }),
  };
};

const runSet = async (deps: EditDeps, input: SetInput): Promise<Done> => {
  const scope = await editScope(deps, input.projectId, input.directionId);
  const target = await targetOf(deps, scope.project, scope.direction, input);
  const loc = target.source;

  if (!loc) {
    throw new EditError(NO_SOURCE);
  }

  const done = await guarded(() =>
    setFill(deps, scope, {
      input: fillInputOf(input),
      target: { selector: target.selector, source: loc, tag: target.tag },
    })
  );

  return setReply(scope, done);
};

const runGet = async (deps: EditDeps, input: GetInput): Promise<Done> => {
  const { direction, project } = await loadTarget(
    deps,
    input.projectId,
    input.directionId
  );

  const target = await targetOf(deps, project, direction, input);
  const loc = target.source;

  if (!loc) {
    throw new EditError(NO_SOURCE);
  }

  const info = await guarded(() =>
    getFill({ direction, project, workTree: direction.workTree }, loc)
  );

  return plain(ok(info));
};

const getFillTool = defineTool(
  "get_fill",
  getSchema,
  {
    description:
      "Read the fill of one element: a solid color or a linear or radial gradient parsed into stops {color, token, position}, with any mix-blend-mode or background-blend-mode, from its Tailwind classes or its CSS. Read only.",
    readOnly: true,
    title: "Get fill",
  },
  runGet
);

const setFillTool = defineTool(
  "set_fill",
  setSchema,
  {
    description:
      "Set the fill of one element. type solid takes color or token; linear takes angle and 2-6 stops; radial takes form, at and 2-6 stops; each stop is {color | token, position %}. Optional blendMode with blendProperty mix-blend-mode or background-blend-mode. In Tailwind it writes bg-linear-<angle> or bg-radial with from-*, via-*, to-* and position classes, with token names when a stop matches a token; otherwise a background-image linear-gradient() or radial-gradient() with var() for token stops. One version and one undo step.",
    title: "Set fill",
  },
  runSet
);

const FILL_TOOLS = [getFillTool, setFillTool];

export { FILL_TOOLS, fillFields };
