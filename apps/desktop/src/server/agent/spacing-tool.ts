import {
  SPACING_PROPERTIES,
  SPACING_PX_MAX,
  SPACING_SIDES,
  SPACING_TOKEN,
} from "@design-studio/contracts/spacing";
import { Schema } from "effect";

import {
  toDefaulted,
  toOptional,
  toOptionalText,
  toSdkFieldSet,
  toToolInput,
  toTrimmedText,
} from "../agent-tools/index.js";
import type { ToolArgs, ToolDecoded } from "../agent-tools/index.js";
import type { WrittenFile } from "../direct-edit/commit/index.js";
import { writeAtomic } from "../direct-edit/commit/index.js";
import { spacingInputOf } from "../mcp/spacing-tools.js";
import { describeElements } from "../page-probe/index.js";
import type { SpacingScope } from "../spacing/commit.js";
import { inspectSpacing } from "../spacing/get.js";
import type { SpacingElement } from "../spacing/get.js";
import { planSpacingSet, toSpacingResult } from "../spacing/set.js";
import type { SpacingTarget } from "../spacing/set.js";
import { refusal, writeProblem } from "./direct-tools.js";
import type { DirectToolDeps } from "./direct-tools.js";
import { targetOf } from "./insert-tool.js";
import { editPageUrl } from "./run-target.js";

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
  | { ok: true; target: SpacingTarget };

const SELECTOR_MAX = 2000;
const SOURCE_MAX = 1100;
const PATH_MAX = 300;

const RUN_NOTE =
  "The run saves this change in its version, like your file edits.";

const TOKEN_MAX = 64;

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

const spacingFields = {
  property: Schema.Literals(SPACING_PROPERTIES).annotate({
    description: "padding, margin, gap, row-gap or column-gap.",
  }),
  side: toDefaulted(
    Schema.Literals(SPACING_SIDES),
    "all" as const,
    "all, x, y, top, right, bottom or left. gap takes all, x (column) or y (row). row-gap and column-gap take all."
  ),
  snap: toDefaulted(
    Schema.Boolean,
    false,
    "Snap value to the nearest spacing token or scale step."
  ),
  token: Schema.optionalKey(
    toTrimmedText(0, TOKEN_MAX)
      .check(Schema.isPattern(SPACING_TOKEN))
      .annotate({
        description:
          'Spacing token, for example "4" (Tailwind scale step), "md" or "--spacing-md".',
      })
  ),
  value: toOptional(
    Schema.Finite.check(
      Schema.isBetween({ maximum: SPACING_PX_MAX, minimum: -SPACING_PX_MAX })
    ),
    "Value in px. Negative only for margin."
  ),
};

const getSpacingFields = { ...targetInput };

const setSpacingFields = { ...targetInput, ...spacingFields };

const getSpacingInput = toSdkFieldSet(getSpacingFields);

const setSpacingInput = toSdkFieldSet(setSpacingFields);

const getSchema = toToolInput(getSpacingFields);
const setSchema = toToolInput(setSpacingFields);

const reply = (message: string): ToolText => ({
  content: [{ text: message, type: "text" }],
});

const refuse = (message: string): ToolText => ({
  content: [{ text: message, type: "text" }],
  isError: true,
});

const issues = (tool: string, error: string): ToolText =>
  refuse(`${tool}: ${error}`);

const caught = (tool: string, error: Error | null): ToolText => {
  if (error instanceof Error) {
    return refuse(`${tool} failed: ${error.message}`);
  }

  return refuse(`${tool} failed: ${String(error)}`);
};

const oneTarget = (input: {
  targetSelector?: string | undefined;
  targetSource?: string | undefined;
}): boolean => Boolean(input.targetSelector) !== Boolean(input.targetSource);

const scopeOf = (deps: DirectToolDeps): SpacingScope => ({
  direction: deps.ctx.direction,
  project: deps.ctx.project,
  workTree: deps.ctx.direction.workTree,
});

const sourceOf = async (
  deps: DirectToolDeps,
  input: ToolDecoded<typeof getSchema>
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
      selector: input.targetSelector ?? null,
      source: target.source,
      tag: target.tag ?? null,
    },
  };
};

const elementOf = async (
  deps: DirectToolDeps,
  input: ToolDecoded<typeof getSchema>
): Promise<SpacingElement | null> => {
  if (!input.targetSelector || !deps.ctx.previewUrl) {
    return null;
  }

  const url = editPageUrl(deps.ctx, input.path);

  const [element] = await describeElements(deps.preview, url, [
    input.targetSelector,
  ]);

  if (!element) {
    return null;
  }

  return { rect: element.rect, styles: element.styles };
};

const getWith = async (
  deps: DirectToolDeps,
  input: ToolDecoded<typeof getSchema>
): Promise<ToolText> => {
  const located = await sourceOf(deps, input);

  if (!located.ok) {
    return refuse(located.message);
  }

  const element = await elementOf(deps, input);

  const info = await inspectSpacing(
    scopeOf(deps),
    located.target.source,
    element
  );

  return reply(JSON.stringify(info, null, 2));
};

const runGetSpacing = async (
  deps: DirectToolDeps,
  args: ToolArgs<typeof getSchema>
): Promise<ToolText> => {
  const parsed = getSchema.safeParse(args);

  if (!parsed.success) {
    return issues("get_spacing", parsed.error);
  }

  if (!oneTarget(parsed.data)) {
    return refuse("Pass targetSelector or targetSource, not both.");
  }

  try {
    return await getWith(deps, parsed.data);
  } catch (error) {
    return caught("get_spacing", error as Error | null);
  }
};

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

const setWith = async (
  deps: DirectToolDeps,
  input: ToolDecoded<typeof setSchema>
): Promise<ToolText> => {
  const located = await sourceOf(deps, input);

  if (!located.ok) {
    return refuse(located.message);
  }

  const plan = await planSpacingSet(scopeOf(deps), {
    input: spacingInputOf(input),
    target: located.target,
  });

  const problem = await writeAll(deps, plan.written);

  if (problem) {
    return refuse(problem);
  }

  const result = JSON.stringify(toSpacingResult(plan, null));

  return reply(`${plan.title}. ${RUN_NOTE} ${result}`);
};

const runSetSpacing = async (
  deps: DirectToolDeps,
  args: ToolArgs<typeof setSchema>
): Promise<ToolText> => {
  const blocked = refusal(deps.ctx, "set_spacing");

  if (blocked) {
    return refuse(blocked);
  }

  const parsed = setSchema.safeParse(args);

  if (!parsed.success) {
    return issues("set_spacing", parsed.error);
  }

  if (!oneTarget(parsed.data)) {
    return refuse("Pass targetSelector or targetSource, not both.");
  }

  try {
    return await setWith(deps, parsed.data);
  } catch (error) {
    return caught("set_spacing", error as Error | null);
  }
};

export { getSpacingInput, runGetSpacing, runSetSpacing, setSpacingInput };
