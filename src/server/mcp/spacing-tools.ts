import { z } from "zod";

import {
  SPACING_PROPERTIES,
  SPACING_PX_MAX,
  SPACING_SIDES,
  SPACING_TOKEN,
} from "../../shared/spacing.js";
import type { SpacingInput } from "../../shared/spacing.js";
import type { SpacingScope } from "../spacing/commit.js";
import { SpacingError } from "../spacing/errors.js";
import { getSpacing } from "../spacing/get.js";
import type { SpacingElement } from "../spacing/get.js";
import { setSpacing, toSpacingResult } from "../spacing/set.js";
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
import { describeElement } from "./element.js";
import { targetOf } from "./insert-tools.js";

const SOURCE_MAX = 1100;

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

const spacingFields = {
  property: z
    .enum(SPACING_PROPERTIES)
    .describe("padding, margin, gap, row-gap or column-gap."),
  side: z
    .enum(SPACING_SIDES)
    .default("all")
    .describe(
      "all, x, y, top, right, bottom or left. gap takes all, x (column) or y (row). row-gap and column-gap take all."
    ),
  snap: z
    .boolean()
    .default(false)
    .describe("Snap value to the nearest spacing token or scale step."),
  token: z
    .string()
    .trim()
    .regex(SPACING_TOKEN)
    .optional()
    .describe(
      'Spacing token, for example "4" (Tailwind scale step), "md" or "--spacing-md".'
    ),
  value: z
    .number()
    .min(-SPACING_PX_MAX)
    .max(SPACING_PX_MAX)
    .optional()
    .describe("Value in px. Negative only for margin."),
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
    ...spacingFields,
  })
  .refine(oneTarget, TARGET_RULE);

type GetInput = z.output<typeof getSchema>;

type SetInput = z.output<typeof setSchema>;

const NO_SOURCE = "The element has no source location. Pass targetSource.";

const spacingInputOf = (input: {
  property: SpacingInput["property"];
  side: SpacingInput["side"];
  snap: boolean;
  token?: string | undefined;
  value?: number | undefined;
}): SpacingInput => ({
  property: input.property,
  side: input.side,
  snap: input.snap,
  token: input.token ?? null,
  value: input.value ?? null,
});

const guarded = async <Result>(
  work: () => Promise<Result>
): Promise<Result> => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof SpacingError) {
      throw new EditError(error.message);
    }

    throw error;
  }
};

const editScope = async (
  deps: EditDeps,
  projectId: string,
  directionId?: string
): Promise<SpacingScope> => {
  const found = await loadTarget(deps, projectId, directionId);

  refuseWhileRunning(deps, found.project, found.direction);

  return {
    direction: found.direction,
    project: found.project,
    workTree: found.direction.workTree,
  };
};

const runSet = async (deps: EditDeps, input: SetInput): Promise<Done> => {
  const scope = await editScope(deps, input.projectId, input.directionId);
  const target = await targetOf(deps, scope.project, scope.direction, input);
  const loc = target.source;

  if (!loc) {
    throw new EditError(NO_SOURCE);
  }

  const { plan, version } = await guarded(() =>
    setSpacing(deps, scope, {
      input: spacingInputOf(input),
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
    result: ok(toSpacingResult(plan, version)),
  };
};

const elementOf = async (
  deps: EditDeps,
  scope: SpacingScope,
  input: GetInput
): Promise<SpacingElement | null> => {
  if (!input.targetSelector) {
    return null;
  }

  const url = await pageUrl(deps, scope.project, scope.direction, input.path);

  const element = await describeElement(
    deps.preview,
    url,
    input.targetSelector
  );

  if (!element) {
    return null;
  }

  return { rect: element.rect, styles: element.styles };
};

const runGet = async (deps: EditDeps, input: GetInput): Promise<Done> => {
  const { direction, project } = await loadTarget(
    deps,
    input.projectId,
    input.directionId
  );

  const scope = { direction, project, workTree: direction.workTree };
  const target = await targetOf(deps, project, direction, input);
  const loc = target.source;

  if (!loc) {
    throw new EditError(NO_SOURCE);
  }

  const element = await elementOf(deps, scope, input);
  const info = await guarded(() => getSpacing(scope, loc, element));

  return plain(ok(info));
};

const getSpacingTool = defineTool(
  "get_spacing",
  getSchema,
  {
    description:
      "Read the box model of one element: padding and margin on each side and the row and column gap, each with its css value, px, spacing token and Tailwind class, and the element rect on the page (with targetSelector). Read only.",
    readOnly: true,
    title: "Get spacing",
  },
  runGet
);

const setSpacingTool = defineTool(
  "set_spacing",
  setSchema,
  {
    description:
      "Set one spacing property (padding, margin, gap, row-gap or column-gap) on one element, for one side, an axis (x, y) or all sides, to a px value or a spacing token. snap: true snaps a px value to the nearest token. In Tailwind it writes scale classes (p-4, px-6, gap-3, -mt-2), and an arbitrary value only when no step matches; otherwise it writes CSS with var() for tokens. One version and one undo step.",
    title: "Set spacing",
  },
  runSet
);

const SPACING_TOOLS = [getSpacingTool, setSpacingTool];

export { SPACING_TOOLS, spacingFields, spacingInputOf };
