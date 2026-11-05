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
} from "@design-studio/contracts/motion";

import type { MotionEditScope } from "../motion/commit.js";
import { inspectMotion } from "../motion/list.js";
import { applyMotion } from "../motion/set.js";
import type { MotionSetDone } from "../motion/set.js";
import { MotionError } from "../motion/site.js";
import { specOf } from "../motion/spec.js";
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

const EASING_MAX = 80;

const ms = (max: number): z.ZodOptional<z.ZodNumber> =>
  z.number().int().min(0).max(max).optional();

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

const motionFields = {
  delayMs: ms(MOTION_DELAY_MAX).describe(
    "Delay before the motion starts, in ms. Default 0."
  ),
  durationMs: ms(MOTION_DURATION_MAX).describe(
    "Duration in ms. Default 200 for a transition and 400 for an entrance."
  ),
  easing: z
    .string()
    .trim()
    .max(EASING_MAX)
    .optional()
    .describe(
      'Transition easing: linear, ease, ease-in, ease-out (default), ease-in-out or "cubic-bezier(0.4,0,0.2,1)".'
    ),
  end: z
    .record(z.string().regex(MOTION_PROPERTY), z.string().regex(MOTION_VALUE))
    .optional()
    .describe(
      'Transition end values for state, for example {"opacity": "0.8", "transform": "translateY(-2px)"}.'
    ),
  kind: z
    .enum(MOTION_KINDS)
    .describe(
      "transition (state change), entrance (on mount) or none (remove motion)."
    ),
  preset: z
    .enum(ENTRANCE_PRESETS)
    .optional()
    .describe("Entrance preset. Default fade."),
  properties: z
    .array(z.string().regex(MOTION_PROPERTY))
    .max(MOTION_PROPERTIES_MAX)
    .optional()
    .describe(
      'CSS properties to transition, or ["all"]. Default: the end keys, else opacity and transform.'
    ),
  staggerMs: ms(MOTION_STAGGER_MAX).describe(
    "Entrance only: extra delay for each child, in ms, so the children enter one after another. Default 0."
  ),
  state: z
    .enum(MOTION_STATES)
    .optional()
    .describe(
      "Transition only: the state whose end values the element animates to."
    ),
};

const oneTarget = (input: {
  targetSelector?: string | undefined;
  targetSource?: string | undefined;
}): boolean => Boolean(input.targetSelector) !== Boolean(input.targetSource);

const TARGET_RULE = "pass targetSelector or targetSource, not both";

const listSchema = z
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
    ...motionFields,
  })
  .refine(oneTarget, TARGET_RULE);

type ListInput = z.output<typeof listSchema>;

type SetInput = z.output<typeof setSchema>;

const editScope = async (
  deps: EditDeps,
  projectId: string,
  directionId?: string
): Promise<MotionEditScope> => {
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
    if (error instanceof MotionError) {
      throw new EditError(error.message);
    }

    throw error;
  }
};

const setReply = (scope: MotionEditScope, done: MotionSetDone): Done => {
  const { plan, version } = done;

  return {
    activity: versionActivity(
      scope.project,
      scope.direction,
      plan.title,
      version
    ),
    result: ok({
      classes: plan.classes,
      files: plan.written.map((entry) => entry.target.relative),
      kind: plan.kind,
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
    throw new EditError(
      "The element has no source location. Pass targetSource."
    );
  }

  const done = await guarded(() =>
    applyMotion(deps, scope, {
      spec: specOf(input),
      target: { selector: target.selector, source: loc, tag: target.tag },
    })
  );

  return setReply(scope, done);
};

const runList = async (deps: EditDeps, input: ListInput): Promise<Done> => {
  const { direction, project } = await loadTarget(
    deps,
    input.projectId,
    input.directionId
  );

  const target = await targetOf(deps, project, direction, input);

  if (!target.source) {
    throw new EditError(
      "The element has no source location. Pass targetSource."
    );
  }

  const loc = target.source;

  const info = await guarded(() =>
    inspectMotion({ project, workTree: direction.workTree }, loc)
  );

  return plain(ok(info));
};

const listMotionTool = defineTool(
  "list_motion",
  listSchema,
  {
    description:
      "List the transitions and entrance animations on one element: the Tailwind motion classes (transition, duration, ease, delay, animate and motion-safe forms) and the studio motion CSS rules for the element, with whether a prefers-reduced-motion guard is there. Read only.",
    readOnly: true,
    title: "List motion",
  },
  runList
);

const setMotionTool = defineTool(
  "set_motion",
  setSchema,
  {
    description:
      "Set the motion of one element. kind transition writes the transition properties, duration, easing, delay and optional hover, focus or active end values; kind entrance plays a fade, slide-up, slide-down, scale-in or blur-in animation on mount, with stagger for children; kind none removes the motion. In Tailwind it writes motion-safe classes (or tw-animate-css classes); elsewhere it writes @keyframes and rules once in a studio motion style block or the app CSS entry. Always guarded by prefers-reduced-motion. One version and one undo step.",
    title: "Set motion",
  },
  runSet
);

const MOTION_TOOLS = [listMotionTool, setMotionTool];

export { MOTION_TOOLS, motionFields };
