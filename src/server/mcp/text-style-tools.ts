import { z } from "zod";

import {
  TEXT_STYLE_LIST_DEFAULT,
  TEXT_STYLE_LIST_MAX,
  TEXT_STYLE_NAME,
  TEXT_STYLE_QUERY_MAX,
} from "../../shared/text-styles.js";
import { applyTextStyle } from "../text-styles/apply.js";
import type { TextStyleApplyDone } from "../text-styles/apply.js";
import type { TextStyleEditScope } from "../text-styles/commit.js";
import { computedTextValues, createTextStyle } from "../text-styles/create.js";
import type { TextStyleCreateDone } from "../text-styles/create.js";
import { listTextStyles, TextStyleError } from "../text-styles/list.js";
import { EditError, loadTarget, refuseWhileRunning } from "./edit-deps.js";
import type { EditDeps } from "./edit-deps.js";
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

const styleName = z.string().trim().regex(TEXT_STYLE_NAME);

const listSchema = z.strictObject({
  directionId: directionIdSchema,
  limit: z
    .number()
    .int()
    .min(1)
    .max(TEXT_STYLE_LIST_MAX)
    .default(TEXT_STYLE_LIST_DEFAULT)
    .describe(`Most styles to return, up to ${TEXT_STYLE_LIST_MAX}.`),
  projectId: projectIdSchema,
  query: z
    .string()
    .trim()
    .max(TEXT_STYLE_QUERY_MAX)
    .optional()
    .describe('Part of a style name, for example "heading" or "xl".'),
});

const applySchema = z
  .strictObject({
    directionId: directionIdSchema,
    path: pagePath,
    projectId: projectIdSchema,
    style: styleName.describe(
      'Text style name from list_text_styles, for example "xl" or "heading-1".'
    ),
    targetSelector: selector
      .optional()
      .describe("CSS selector or layer id of the text element."),
    targetSource: z
      .string()
      .trim()
      .max(SOURCE_MAX)
      .optional()
      .describe(
        "Or the element as file:line:col of its tag, as get_layers prints it."
      ),
  })
  .refine(
    (input) => Boolean(input.targetSelector) !== Boolean(input.targetSource),
    "pass targetSelector or targetSource, not both"
  );

const createSchema = z.strictObject({
  directionId: directionIdSchema,
  name: styleName.describe('New style name, for example "card-title".'),
  path: pagePath,
  projectId: projectIdSchema,
  targetSelector: selector.describe(
    "CSS selector or layer id of the element whose computed text props become the style."
  ),
});

type ApplyInput = z.output<typeof applySchema>;

type CreateInput = z.output<typeof createSchema>;

const editScope = async (
  deps: EditDeps,
  projectId: string,
  directionId?: string
): Promise<TextStyleEditScope> => {
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
    if (error instanceof TextStyleError) {
      throw new EditError(error.message);
    }

    throw error;
  }
};

const applyReply = (
  scope: TextStyleEditScope,
  done: TextStyleApplyDone
): Done => {
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
      file: plan.written.target.relative,
      mode: plan.mode,
      style: plan.style.name,
      title: version.title,
      versionId: version.id,
    }),
  };
};

const createReply = (
  scope: TextStyleEditScope,
  done: TextStyleCreateDone
): Done => {
  const { plan, version } = done;

  return {
    activity: versionActivity(
      scope.project,
      scope.direction,
      plan.title,
      version
    ),
    result: ok({
      file: plan.written.target.relative,
      name: plan.name,
      source: plan.source,
      title: version.title,
      values: plan.values,
      versionId: version.id,
    }),
  };
};

const runApply = async (deps: EditDeps, input: ApplyInput): Promise<Done> => {
  const scope = await editScope(deps, input.projectId, input.directionId);
  const target = await targetOf(deps, scope.project, scope.direction, input);
  const loc = target.source;

  if (!loc) {
    throw new EditError(
      "The element has no source location. Pass targetSource."
    );
  }

  const done = await guarded(() =>
    applyTextStyle(deps, scope, {
      style: input.style,
      target: { selector: target.selector, source: loc, tag: target.tag },
    })
  );

  return applyReply(scope, done);
};

const runCreate = async (deps: EditDeps, input: CreateInput): Promise<Done> => {
  const scope = await editScope(deps, input.projectId, input.directionId);
  const url = await pageUrl(deps, scope.project, scope.direction, input.path);

  const element = await describeElement(
    deps.preview,
    url,
    input.targetSelector
  );

  if (!element) {
    throw new EditError(
      `No element matches ${input.targetSelector} on the page.`
    );
  }

  const done = await guarded(() =>
    createTextStyle(deps, scope, {
      name: input.name,
      values: computedTextValues(element.styles),
    })
  );

  return createReply(scope, done);
};

const listTextStylesTool = defineTool(
  "list_text_styles",
  listSchema,
  {
    description:
      "List the project type scale that apply_text_style can use, read in this order: Tailwind v4 @theme --text-* (with --line-height, --font-weight and --letter-spacing pairs) and --font-* vars, tokens.json typography, CSS vars in :root, then the DESIGN.md typography section. Returns name, size, weight, line-height, letter-spacing, family and source. Read only.",
    readOnly: true,
    title: "List text styles",
  },
  async (deps, input): Promise<Done> => {
    const { direction } = await loadTarget(
      deps,
      input.projectId,
      input.directionId
    );

    const list = await listTextStyles({ workTree: direction.workTree }, input);

    return plain(ok(list));
  }
);

const applyTextStyleTool = defineTool(
  "apply_text_style",
  applySchema,
  {
    description:
      "Apply a text style from list_text_styles to one element. In a Tailwind file it writes the classes (text-xl, font-semibold, leading-*, tracking-*) and removes the text size, font, leading and tracking classes they replace; otherwise it writes font-size, font-weight, line-height, letter-spacing and font-family as CSS var references in the rule or inline style. One version and one undo step.",
    title: "Apply text style",
  },
  runApply
);

const createTextStyleTool = defineTool(
  "create_text_style",
  createSchema,
  {
    description:
      "Read the computed font size, weight, line-height, letter-spacing and family of one element on the live page and add them as a new text style token to the project token source: the Tailwind @theme block (--text-<name> with pairs), tokens.json typography or :root CSS vars. One version and one undo step.",
    title: "Create text style",
  },
  runCreate
);

const TEXT_STYLE_TOOLS = [
  listTextStylesTool,
  applyTextStyleTool,
  createTextStyleTool,
];

export { TEXT_STYLE_TOOLS };
