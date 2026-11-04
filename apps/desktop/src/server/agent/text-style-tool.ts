import type {
  SdkMcpToolDefinition,
  tool as sdkTool,
} from "@anthropic-ai/claude-agent-sdk";
import type { SelectionContext } from "@design-studio/contracts";
import { Schema } from "effect";

import {
  TEXT_STYLE_LIST_DEFAULT,
  TEXT_STYLE_LIST_MAX,
  TEXT_STYLE_NAME,
  TEXT_STYLE_QUERY_MAX,
} from "../../shared/text-styles.js";
import {
  toDefaulted,
  toOptionalText,
  toSdkFieldSet,
  toToolInput,
  toTrimmedText,
} from "../agent-tools/index.js";
import type { ToolArgs, ToolDecoded } from "../agent-tools/index.js";
import type { WrittenFile } from "../direct-edit/commit/index.js";
import { writeAtomic } from "../direct-edit/index.js";
import { describeElements } from "../page-probe/index.js";
import { planTextStyleApply } from "../text-styles/apply.js";
import type { TextStyleApplyPlan } from "../text-styles/apply.js";
import {
  computedTextValues,
  planTextStyleCreate,
} from "../text-styles/create.js";
import type { TextStyleCreatePlan } from "../text-styles/create.js";
import { createTextStyleDetach } from "../text-styles/detach.js";
import { listTextStyles } from "../text-styles/list.js";
import { refusal, writeProblem } from "./direct-tools.js";
import type { DirectToolDeps } from "./direct-tools.js";
import { targetOf } from "./insert-tool.js";
import { withLayerIds } from "./kit-tools.js";
import { editPageUrl } from "./run-target.js";
import { TOOL_SHORT } from "./tool-help.js";

type ToolFn = typeof sdkTool;

type ReadStyleTool =
  | SdkMcpToolDefinition<typeof applyTextStyleInput>
  | SdkMcpToolDefinition<typeof listTextStylesInput>;

type WriteStyleTool =
  | SdkMcpToolDefinition<typeof createTextStyleInput>
  | SdkMcpToolDefinition<typeof detachTextStyleInput>;

interface ToolContent {
  text: string;
  type: "text";
}

interface ToolText {
  [key: string]: boolean | ToolContent[] | undefined;
  content: ToolContent[];
  isError?: boolean;
}

type Probed =
  | { element: SelectionContext; ok: true }
  | { message: string; ok: false };

const SELECTOR_MAX = 2000;
const SOURCE_MAX = 1100;
const PATH_MAX = 300;
const STYLE_NAME_MAX = 64;

const RUN_NOTE =
  "The run saves this change in its version, like your file edits.";

const pathField = toOptionalText(
  0,
  PATH_MAX,
  "Page path. Leave out for the page of the frame in <canvas-context> (or the entry page)."
);

const selectorField = toOptionalText(
  1,
  SELECTOR_MAX,
  "CSS selector or layer id of the text element on the live page."
);

const styleNameText = toTrimmedText(0, STYLE_NAME_MAX).check(
  Schema.isPattern(TEXT_STYLE_NAME)
);

const listTextStylesFields = {
  limit: toDefaulted(
    Schema.Int.check(
      Schema.isBetween({ maximum: TEXT_STYLE_LIST_MAX, minimum: 1 })
    ),
    TEXT_STYLE_LIST_DEFAULT,
    `Most styles to return, up to ${TEXT_STYLE_LIST_MAX}.`
  ),
  query: toOptionalText(
    0,
    TEXT_STYLE_QUERY_MAX,
    'Part of a style name, for example "heading".'
  ),
};

const applyTextStyleFields = {
  path: pathField,
  style: styleNameText.annotate({
    description: 'Text style name from list_text_styles, for example "xl".',
  }),
  targetSelector: selectorField,
  targetSource: toOptionalText(
    0,
    SOURCE_MAX,
    'Or the element as file:line:col, for example "src/App.tsx:12:7".'
  ),
};

const createTextStyleFields = {
  name: styleNameText.annotate({
    description: 'New style name, for example "card-title".',
  }),
  path: pathField,
  targetSelector: toTrimmedText(1, SELECTOR_MAX).annotate({
    description:
      "CSS selector or layer id of the element to copy text props from.",
  }),
};

const detachTextStyleFields = {
  path: pathField,
  targetSelector: toTrimmedText(1, SELECTOR_MAX).annotate({
    description:
      "CSS selector or layer id of the text element to detach from its text style.",
  }),
};

const detachTextStyleInput = toSdkFieldSet(detachTextStyleFields);
const detachSchema = toToolInput(detachTextStyleFields);
const listTextStylesInput = toSdkFieldSet(listTextStylesFields);
const applyTextStyleInput = toSdkFieldSet(applyTextStyleFields);
const createTextStyleInput = toSdkFieldSet(createTextStyleFields);

const listSchema = toToolInput(listTextStylesFields);
const applySchema = toToolInput(applyTextStyleFields);
const createSchema = toToolInput(createTextStyleFields);

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

const writeOut = async (
  deps: DirectToolDeps,
  written: WrittenFile
): Promise<string | null> => {
  const problem = writeProblem(deps.ctx, written.target.relative);

  if (problem) {
    return problem;
  }

  await writeAtomic(written.target.file, written.code);

  return null;
};

const howApplied = (plan: TextStyleApplyPlan): string => {
  if (!plan.classes) {
    return "CSS text props";
  }

  const added = plan.classes.add.join(" ") || "none";
  const removed = plan.classes.remove.join(" ") || "none";

  return `added ${added}, removed ${removed}`;
};

const appliedText = (plan: TextStyleApplyPlan): string =>
  `${plan.title} in ${plan.written.target.relative} (${howApplied(plan)}). ${RUN_NOTE}`;

const createdText = (plan: TextStyleCreatePlan): string =>
  `${plan.title} in ${plan.written.target.relative} (${plan.source}): ${JSON.stringify(plan.values)}. ${RUN_NOTE}`;

const runListTextStyles = async (
  deps: DirectToolDeps,
  args: ToolArgs<typeof listSchema>
): Promise<ToolText> => {
  const parsed = listSchema.safeParse(args);

  if (!parsed.success) {
    return issues("list_text_styles", parsed.error);
  }

  try {
    const list = await listTextStyles(
      { workTree: deps.ctx.direction.workTree },
      parsed.data
    );

    return reply(JSON.stringify(list, null, 2));
  } catch (error) {
    if (error instanceof Error) {
      return failure("list_text_styles", error);
    }

    return failure("list_text_styles", String(error));
  }
};

const applyWith = async (
  deps: DirectToolDeps,
  input: ToolDecoded<typeof applySchema>
): Promise<ToolText> => {
  const target = await targetOf(deps, input);

  if (!(target instanceof Object)) {
    return refuse(target);
  }

  if (!target.source) {
    return refuse("The element has no source location. Pass targetSource.");
  }

  const { direction, project } = deps.ctx;

  const plan = await planTextStyleApply(
    { project, workTree: direction.workTree },
    {
      style: input.style,
      target: {
        selector: input.targetSelector,
        source: target.source,
        tag: target.tag,
      },
    }
  );

  const problem = await writeOut(deps, plan.written);

  if (problem) {
    return refuse(problem);
  }

  return reply(appliedText(plan));
};

const runApplyTextStyle = async (
  deps: DirectToolDeps,
  args: ToolArgs<typeof applySchema>
): Promise<ToolText> => {
  const blocked = refusal(deps.ctx, "apply_text_style");

  if (blocked) {
    return refuse(blocked);
  }

  const parsed = applySchema.safeParse(args);

  if (!parsed.success) {
    return issues("apply_text_style", parsed.error);
  }

  if (
    Boolean(parsed.data.targetSelector) === Boolean(parsed.data.targetSource)
  ) {
    return refuse("Pass targetSelector or targetSource, not both.");
  }

  try {
    return await applyWith(deps, parsed.data);
  } catch (error) {
    if (error instanceof Error) {
      return failure("apply_text_style", error);
    }

    return failure("apply_text_style", String(error));
  }
};

const probeElement = async (
  deps: DirectToolDeps,
  input: Pick<ToolDecoded<typeof createSchema>, "path" | "targetSelector">
): Promise<Probed> => {
  if (!deps.ctx.previewUrl) {
    return {
      message:
        "Preview is not running for this direction, so computed text props cannot be read.",
      ok: false,
    };
  }

  const url = editPageUrl(deps.ctx, input.path);

  const [element] = await describeElements(deps.preview, url, [
    input.targetSelector,
  ]);

  if (!element) {
    return {
      message: `No element matches ${input.targetSelector} on the page.`,
      ok: false,
    };
  }

  return { element, ok: true };
};

const createWith = async (
  deps: DirectToolDeps,
  input: ToolDecoded<typeof createSchema>
): Promise<ToolText> => {
  const probed = await probeElement(deps, input);

  if (!probed.ok) {
    return refuse(probed.message);
  }

  const plan = await planTextStyleCreate(deps.ctx.direction.workTree, {
    name: input.name,
    values: computedTextValues(probed.element.styles),
  });

  const problem = await writeOut(deps, plan.written);

  if (problem) {
    return refuse(problem);
  }

  return reply(createdText(plan));
};

const runCreateTextStyle = async (
  deps: DirectToolDeps,
  args: ToolArgs<typeof createSchema>
): Promise<ToolText> => {
  const blocked = refusal(deps.ctx, "create_text_style");

  if (blocked) {
    return refuse(blocked);
  }

  const parsed = createSchema.safeParse(args);

  if (!parsed.success) {
    return issues("create_text_style", parsed.error);
  }

  try {
    return await createWith(deps, parsed.data);
  } catch (error) {
    if (error instanceof Error) {
      return failure("create_text_style", error);
    }

    return failure("create_text_style", String(error));
  }
};

const runDetachWith = async (
  deps: DirectToolDeps,
  input: ToolDecoded<typeof detachSchema>
): Promise<ToolText> => {
  const probed = await probeElement(deps, input);

  if (!probed.ok) {
    return refuse(probed.message);
  }

  const { source } = probed.element;

  if (!source) {
    return refuse("The element has no source location.");
  }

  const { direction, project } = deps.ctx;
  const { targetSelector: selector } = input;

  const written = await createTextStyleDetach(
    { project, workTree: direction.workTree },
    {
      styles: probed.element.styles,
      target: { selector, source, tag: null },
    }
  );

  const problem = await writeOut(deps, written);

  if (problem) {
    return refuse(problem);
  }

  return reply(`Detach text style in ${written.target.relative}. ${RUN_NOTE}`);
};

const runDetachTextStyle = async (
  deps: DirectToolDeps,
  args: ToolArgs<typeof detachSchema>
): Promise<ToolText> => {
  const blocked = refusal(deps.ctx, "detach_text_style");

  if (blocked) {
    return refuse(blocked);
  }

  const parsed = detachSchema.safeParse(args);

  if (!parsed.success) {
    return issues("detach_text_style", parsed.error);
  }

  try {
    return await runDetachWith(deps, parsed.data);
  } catch (error) {
    if (error instanceof Error) {
      return failure("detach_text_style", error);
    }

    return failure("detach_text_style", String(error));
  }
};

const createTextStyleTools = (
  deps: DirectToolDeps,
  toolFn: ToolFn
): (ReadStyleTool | WriteStyleTool)[] => [
  toolFn(
    "list_text_styles",
    TOOL_SHORT.list_text_styles,
    listTextStylesInput,
    (args) => runListTextStyles(deps, args),
    { annotations: { readOnlyHint: true } }
  ),
  toolFn(
    "apply_text_style",
    TOOL_SHORT.apply_text_style,
    applyTextStyleInput,
    withLayerIds(deps, (args) => runApplyTextStyle(deps, args))
  ),
  toolFn(
    "create_text_style",
    TOOL_SHORT.create_text_style,
    createTextStyleInput,
    withLayerIds(deps, (args) => runCreateTextStyle(deps, args))
  ),
  toolFn(
    "detach_text_style",
    TOOL_SHORT.detach_text_style,
    detachTextStyleInput,
    withLayerIds(deps, (args) => runDetachTextStyle(deps, args))
  ),
];

export { createTextStyleTools };
