import type { SourceLoc } from "../../shared/actions/_core/contracts.js";
import type { BreakpointScope } from "../breakpoints/commit.js";
import { BreakpointError } from "../breakpoints/errors.js";
import {
  LIST_BREAKPOINTS_DESCRIPTION,
  SET_BREAKPOINT_STYLE_DESCRIPTION,
  toStyleInput,
} from "../breakpoints/input.js";
import { listBreakpoints } from "../breakpoints/list.js";
import { setBreakpointStyle, toBreakpointResult } from "../breakpoints/set.js";
import {
  listBreakpointFields,
  setBreakpointFields,
} from "../breakpoints/tool-fields.js";
import { DirectEditError } from "../direct-edit/engine/index.js";
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

const notBoth = (input: {
  targetSelector?: string | undefined;
  targetSource?: string | undefined;
}): boolean => !(input.targetSelector && input.targetSource);

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
    ...listBreakpointFields,
  })
  .refine(notBoth, TARGET_RULE);

const setSchema = z
  .strictObject({
    directionId: directionIdSchema,
    path: pagePath,
    projectId: projectIdSchema,
    ...targetFields,
    ...setBreakpointFields,
  })
  .refine(oneTarget, TARGET_RULE);

type ListInput = z.output<typeof listSchema>;

type SetInput = z.output<typeof setSchema>;

const guarded = async <Result>(
  work: () => Promise<Result>
): Promise<Result> => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof BreakpointError || error instanceof DirectEditError) {
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

const sourceOf = async (
  deps: EditDeps,
  scope: BreakpointScope,
  input: ListInput
): Promise<SourceLoc | null> => {
  if (!input.targetSelector && !input.targetSource) {
    return null;
  }

  const target = await targetOf(deps, scope.project, scope.direction, input);

  if (!target.source) {
    throw new EditError(NO_SOURCE);
  }

  return target.source;
};

const runList = async (deps: EditDeps, input: ListInput): Promise<Done> => {
  const scope = await scopeOf(deps, input.projectId, input.directionId);

  const [located, snapshot] = await Promise.all([
    sourceOf(deps, scope, input),
    deps.canvas.read(scope.project),
  ]);

  const result = await guarded(() =>
    listBreakpoints(scope, {
      frame: input.frame ?? null,
      frames: snapshot.canvas?.frames ?? [],
      source: located,
      width: input.width ?? null,
    })
  );

  return plain(ok(result));
};

const runSet = async (deps: EditDeps, input: SetInput): Promise<Done> => {
  const scope = await scopeOf(deps, input.projectId, input.directionId);

  refuseWhileRunning(deps, scope.project, scope.direction);

  const target = await targetOf(deps, scope.project, scope.direction, input);
  const loc = target.source;

  if (!loc) {
    throw new EditError(NO_SOURCE);
  }

  const { plan, version } = await guarded(() =>
    setBreakpointStyle(deps, scope, {
      input: toStyleInput(input),
      target: {
        selector: target.selector ?? null,
        source: loc,
        tag: target.tag ?? null,
      },
    })
  );

  return {
    activity: versionActivity(
      scope.project,
      scope.direction,
      plan.title,
      version
    ),
    result: ok(toBreakpointResult(plan, version)),
  };
};

const listBreakpointsTool = defineTool(
  "list_breakpoints",
  listSchema,
  {
    description: LIST_BREAKPOINTS_DESCRIPTION,
    idempotent: true,
    readOnly: true,
    title: "List breakpoints",
  },
  runList
);

const setBreakpointStyleTool = defineTool(
  "set_breakpoint_style",
  setSchema,
  {
    description: SET_BREAKPOINT_STYLE_DESCRIPTION,
    title: "Set breakpoint style",
  },
  runSet
);

const BREAKPOINT_TOOLS = [listBreakpointsTool, setBreakpointStyleTool];

export { BREAKPOINT_TOOLS };
