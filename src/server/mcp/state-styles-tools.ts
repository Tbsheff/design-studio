import type { BreakpointScope } from "../breakpoints/commit.js";
import { DirectEditError } from "../direct-edit/engine/errors.js";
import {
  forcedStateFields,
  setStateFields,
} from "../platform/tool-fields/state-styles.js";
import { z } from "../platform/zod-bridge/index.js";
import { StateStyleError } from "../state-styles/errors.js";
import { forcedSummary, setForcedState } from "../state-styles/forced.js";
import {
  LIST_STATE_STYLES_DESCRIPTION,
  SET_FORCED_STATE_DESCRIPTION,
  SET_STATE_STYLE_DESCRIPTION,
  toStateInput,
} from "../state-styles/input.js";
import { listStateStyles } from "../state-styles/list.js";
import { setStateStyle, toStateResult } from "../state-styles/set.js";
import type { StateTarget } from "../state-styles/set.js";
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

const NO_SOURCE = "The layer has no source location. Pass targetSource.";

const TARGET_RULE = "pass targetSelector or targetSource, not both";

const targetFields = {
  targetSelector: selector
    .optional()
    .describe("CSS selector or layer id of the layer."),
  targetSource: z
    .string()
    .trim()
    .max(SOURCE_MAX)
    .optional()
    .describe(
      "Or the layer as file:line:col of its tag, as get_layers prints it."
    ),
};

const oneTarget = (input: {
  targetSelector?: string | undefined;
  targetSource?: string | undefined;
}): boolean => Boolean(input.targetSelector) !== Boolean(input.targetSource);

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
    ...setStateFields,
  })
  .refine(oneTarget, TARGET_RULE);

const forcedSchema = z.strictObject({
  projectId: projectIdSchema,
  ...forcedStateFields,
});

type ListInput = z.output<typeof listSchema>;

type SetInput = z.output<typeof setSchema>;

type ForcedInput = z.output<typeof forcedSchema>;

const guardedNow = <Result>(work: () => Result): Result => {
  try {
    return work();
  } catch (error) {
    if (error instanceof StateStyleError) {
      throw new EditError(error.message);
    }

    throw error;
  }
};

const guarded = async <Result>(
  work: () => Promise<Result>
): Promise<Result> => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof StateStyleError || error instanceof DirectEditError) {
      throw new EditError(error.message);
    }

    throw error;
  }
};

const scopeOf = async (
  deps: EditDeps,
  projectId: string,
  directionId: string | undefined
): Promise<BreakpointScope> => {
  const found = await loadTarget(deps, projectId, directionId);

  return {
    direction: found.direction,
    project: found.project,
    workTree: found.direction.workTree,
  };
};

const locate = async (
  deps: EditDeps,
  scope: BreakpointScope,
  input: ListInput
): Promise<StateTarget> => {
  const target = await targetOf(deps, scope.project, scope.direction, input);

  if (!target.source) {
    throw new EditError(NO_SOURCE);
  }

  return {
    selector: target.selector ?? null,
    source: target.source,
    tag: target.tag ?? null,
  };
};

const runList = async (deps: EditDeps, input: ListInput): Promise<Done> => {
  const scope = await scopeOf(deps, input.projectId, input.directionId);
  const target = await locate(deps, scope, input);

  const result = await guarded(() => listStateStyles(scope, target.source));

  return plain(ok(result));
};

const runSet = async (deps: EditDeps, input: SetInput): Promise<Done> => {
  const scope = await scopeOf(deps, input.projectId, input.directionId);

  refuseWhileRunning(deps, scope.project, scope.direction);

  const target = await locate(deps, scope, input);

  const { plan, version } = await guarded(() =>
    setStateStyle(deps, scope, { input: toStateInput(input), target })
  );

  return {
    activity: versionActivity(
      scope.project,
      scope.direction,
      plan.title,
      version
    ),
    result: ok(toStateResult(plan, version)),
  };
};

const runForced = async (deps: EditDeps, input: ForcedInput): Promise<Done> => {
  const { project } = await loadTarget(deps, input.projectId);
  const snapshot = await deps.canvas.read(project);

  const forced = guardedNow(() =>
    setForcedState({
      frameId: input.frameId,
      frames: snapshot.canvas?.frames ?? [],
      layer: input.layer ?? null,
      projectId: project.id,
      state: input.state,
    })
  );

  return plain(ok(forcedSummary(forced)));
};

const listStateStylesTool = defineTool(
  "list_state_styles",
  listSchema,
  {
    description: LIST_STATE_STYLES_DESCRIPTION,
    idempotent: true,
    readOnly: true,
    title: "List state styles",
  },
  runList
);

const setStateStyleTool = defineTool(
  "set_state_style",
  setSchema,
  {
    description: SET_STATE_STYLE_DESCRIPTION,
    title: "Set state style",
  },
  runSet
);

const setForcedStateTool = defineTool(
  "set_forced_state",
  forcedSchema,
  {
    description: SET_FORCED_STATE_DESCRIPTION,
    idempotent: true,
    title: "Set forced state",
  },
  runForced
);

const STATE_STYLE_TOOLS = [
  listStateStylesTool,
  setStateStyleTool,
  setForcedStateTool,
];

export { STATE_STYLE_TOOLS };
