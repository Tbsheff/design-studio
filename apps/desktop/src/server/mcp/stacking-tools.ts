import type { BreakpointScope } from "../breakpoints/commit.js";
import { DirectEditError } from "../direct-edit/engine/index.js";
import { z } from "../platform/zod-bridge/index.js";
import { StackingError } from "../stacking/errors.js";
import { getStacking } from "../stacking/get.js";
import {
  GET_STACKING_DESCRIPTION,
  SET_STACKING_DESCRIPTION,
  toStackingInput,
} from "../stacking/input.js";
import { setStacking, toStackingResult } from "../stacking/set.js";
import type { StackingTarget } from "../stacking/set.js";
import {
  getStackingFields,
  setStackingFields,
} from "../stacking/tool-fields.js";
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

const NO_CHANGE =
  "Pass at least one of position, top, right, bottom, left, overflow, overflowX, overflowY or zIndex.";

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

const getSchema = z
  .strictObject({
    directionId: directionIdSchema,
    path: pagePath,
    projectId: projectIdSchema,
    ...targetFields,
    ...getStackingFields,
  })
  .refine(oneTarget, TARGET_RULE);

const setSchema = z
  .strictObject({
    directionId: directionIdSchema,
    path: pagePath,
    projectId: projectIdSchema,
    ...targetFields,
    ...setStackingFields,
  })
  .refine(oneTarget, TARGET_RULE);

type GetInput = z.output<typeof getSchema>;

type SetInput = z.output<typeof setSchema>;

const guarded = async <Result>(
  work: () => Promise<Result>
): Promise<Result> => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof StackingError || error instanceof DirectEditError) {
      throw new EditError(error.message);
    }

    throw error;
  }
};

const scopeOf = async (
  deps: EditDeps,
  projectId: string,
  directionId?: string
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
  input: GetInput | SetInput
): Promise<StackingTarget> => {
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

const runGet = async (deps: EditDeps, input: GetInput): Promise<Done> => {
  const scope = await scopeOf(deps, input.projectId, input.directionId);
  const target = await locate(deps, scope, input);

  const result = await guarded(() =>
    getStacking(scope, {
      breakpoint: input.breakpoint ?? "base",
      source: target.source,
    })
  );

  return plain(ok(result));
};

const runSet = async (deps: EditDeps, input: SetInput): Promise<Done> => {
  const scope = await scopeOf(deps, input.projectId, input.directionId);

  refuseWhileRunning(deps, scope.project, scope.direction);

  const stacking = toStackingInput(input);

  if (stacking === null) {
    throw new EditError(NO_CHANGE);
  }

  const target = await locate(deps, scope, input);

  const { plan, version } = await guarded(() =>
    setStacking(deps, scope, { input: stacking, target })
  );

  return {
    activity: versionActivity(
      scope.project,
      scope.direction,
      plan.title,
      version
    ),
    result: ok(toStackingResult(plan, version)),
  };
};

const getStackingTool = defineTool(
  "get_stacking",
  getSchema,
  {
    description: GET_STACKING_DESCRIPTION,
    idempotent: true,
    readOnly: true,
    title: "Get stacking",
  },
  runGet
);

const setStackingTool = defineTool(
  "set_stacking",
  setSchema,
  {
    description: SET_STACKING_DESCRIPTION,
    title: "Set stacking",
  },
  runSet
);

const STACKING_TOOLS = [getStackingTool, setStackingTool];

export { STACKING_TOOLS };
