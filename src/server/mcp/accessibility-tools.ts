import { z } from "zod";

import { AccessibilityError } from "../accessibility/errors.js";
import { frameOf } from "../accessibility/frame.js";
import type { AccessibilityFrame } from "../accessibility/frame.js";
import {
  INSPECT_ACCESSIBILITY_DESCRIPTION,
  inspectAccessibilityFields,
  NO_ACCESSIBILITY_CHANGE,
  SET_ACCESSIBILITY_DESCRIPTION,
  setAccessibilityFields,
  toAccessibilityChanges,
} from "../accessibility/input.js";
import { inspectAccessibility } from "../accessibility/inspect.js";
import {
  setAccessibility,
  toAccessibilityResult,
} from "../accessibility/set.js";
import type { AccessibilityTarget } from "../accessibility/set.js";
import type { BreakpointScope } from "../breakpoints/commit.js";
import { frameRef } from "../canvas/tools.js";
import { readDesignSystemState } from "../design-system/state.js";
import { DirectEditError } from "../direct-edit/engine/errors.js";
import { describeElement } from "../page-probe/element.js";
import { scopeOf as refScopeOf } from "../page-probe/layer-ref.js";
import { resolveSourceLoc } from "../page-probe/source-loc.js";
import { EditError, loadTarget, refuseWhileRunning } from "./edit-guards.js";
import type { EditDeps } from "./edit-guards.js";
import {
  defineTool,
  directionId as directionIdSchema,
  ok,
  pagePath,
  pageUrl,
  plain,
  projectId as projectIdSchema,
  selector,
  versionActivity,
} from "./edit-kit.js";
import type { Done } from "./edit-kit.js";

const SOURCE_MAX = 1100;

const TARGET_RULE = "pass targetSelector or targetSource, not both";

const NO_SOURCE =
  "The layer has no source location. Pass targetSource with the file:line:col of its tag.";

const inspectSchema = z.strictObject({
  directionId: directionIdSchema,
  frame: frameRef
    .optional()
    .describe(
      "Canvas frame id or @label from canvas_list. Its page, size and direction are used. Default f1."
    ),
  projectId: projectIdSchema,
  targetSelector: selector
    .optional()
    .describe(
      "CSS selector or layer id of one layer. Leave out to check the whole frame."
    ),
  ...inspectAccessibilityFields,
});

const setSchema = z
  .strictObject({
    directionId: directionIdSchema,
    path: pagePath,
    projectId: projectIdSchema,
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
    ...setAccessibilityFields,
  })
  .refine(
    (input) => Boolean(input.targetSelector) !== Boolean(input.targetSource),
    TARGET_RULE
  );

type InspectInput = z.output<typeof inspectSchema>;

type SetInput = z.output<typeof setSchema>;

const guarded = async <Result>(
  work: () => Promise<Result>
): Promise<Result> => {
  try {
    return await work();
  } catch (error) {
    if (
      error instanceof AccessibilityError ||
      error instanceof DirectEditError
    ) {
      throw new EditError(error.message);
    }

    throw error;
  }
};

const frameFor = async (
  deps: EditDeps,
  input: InspectInput
): Promise<{ frame: AccessibilityFrame; scope: BreakpointScope }> => {
  const loaded = await loadTarget(deps, input.projectId, input.directionId);
  const snapshot = await deps.canvas.read(loaded.project);
  const frames = snapshot.canvas?.frames ?? [];

  const frame = await guarded(() =>
    Promise.resolve(frameOf(frames, input.frame ?? null))
  );

  let found = loaded;

  if (frame.directionId !== null && !input.directionId) {
    found = await loadTarget(deps, input.projectId, frame.directionId);
  }

  return {
    frame,
    scope: {
      direction: found.direction,
      project: found.project,
      workTree: found.direction.workTree,
    },
  };
};

const runInspect = async (
  deps: EditDeps,
  input: InspectInput
): Promise<Done> => {
  const { frame, scope } = await frameFor(deps, input);
  const page = frame.page ?? "";

  const [address, state] = await Promise.all([
    pageUrl(deps, scope.project, scope.direction, page),
    readDesignSystemState(scope.project, scope.direction),
  ]);

  const report = await guarded(() =>
    inspectAccessibility(deps.preview, state.entries, {
      frame: frame.id,
      page: page || "/",
      passing: input.includePassing ?? false,
      root: input.targetSelector ?? null,
      url: address,
      viewport: frame.viewport,
    })
  );

  return plain(ok(report));
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
  input: SetInput
): Promise<AccessibilityTarget> => {
  if (input.targetSource) {
    const source = await resolveSourceLoc(
      scope.workTree,
      refScopeOf(scope.project.id, scope.direction.id),
      input.targetSource
    );

    return { source, tag: null, usedAt: null };
  }

  const sel = input.targetSelector ?? "";
  const url = await pageUrl(deps, scope.project, scope.direction, input.path);
  const element = await describeElement(deps.preview, url, sel);

  if (!element) {
    throw new EditError(`No element matches ${sel} on the page.`);
  }

  if (!element.source) {
    throw new EditError(NO_SOURCE);
  }

  return {
    source: element.source,
    tag: element.tag,
    usedAt: element.usedAt ?? null,
  };
};

const runSet = async (deps: EditDeps, input: SetInput): Promise<Done> => {
  const scope = await scopeOf(deps, input.projectId, input.directionId);

  refuseWhileRunning(deps, scope.project, scope.direction);

  const changes = toAccessibilityChanges(input);

  if (changes === null) {
    throw new EditError(NO_ACCESSIBILITY_CHANGE);
  }

  const target = await locate(deps, scope, input);

  const { plan, version } = await guarded(() =>
    setAccessibility(deps, scope, { changes, target })
  );

  return {
    activity: versionActivity(
      scope.project,
      scope.direction,
      plan.title,
      version
    ),
    result: ok(toAccessibilityResult(plan, version)),
  };
};

const inspectAccessibilityTool = defineTool(
  "inspect_accessibility",
  inspectSchema,
  {
    description: INSPECT_ACCESSIBILITY_DESCRIPTION,
    idempotent: true,
    readOnly: true,
    title: "Inspect accessibility",
  },
  runInspect
);

const setAccessibilityTool = defineTool(
  "set_accessibility",
  setSchema,
  {
    description: SET_ACCESSIBILITY_DESCRIPTION,
    title: "Set accessibility",
  },
  runSet
);

const ACCESSIBILITY_TOOLS = [inspectAccessibilityTool, setAccessibilityTool];

export { ACCESSIBILITY_TOOLS };
