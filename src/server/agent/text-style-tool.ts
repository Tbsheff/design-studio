import { z } from "zod";

import type { SelectionContext } from "../../shared/contracts.js";
import {
  TEXT_STYLE_LIST_DEFAULT,
  TEXT_STYLE_LIST_MAX,
  TEXT_STYLE_NAME,
  TEXT_STYLE_QUERY_MAX,
} from "../../shared/text-styles.js";
import type { WrittenFile } from "../direct-edit/commit/batch.js";
import { writeAtomic } from "../direct-edit/index.js";
import { describeElements } from "../page-probe/element.js";
import { planTextStyleApply } from "../text-styles/apply.js";
import type { TextStyleApplyPlan } from "../text-styles/apply.js";
import {
  computedTextValues,
  planTextStyleCreate,
} from "../text-styles/create.js";
import type { TextStyleCreatePlan } from "../text-styles/create.js";
import { listTextStyles } from "../text-styles/list.js";
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

type Probed =
  | { element: SelectionContext; ok: true }
  | { message: string; ok: false };

const SELECTOR_MAX = 2000;
const SOURCE_MAX = 1100;
const PATH_MAX = 300;

const RUN_NOTE =
  "The run saves this change in its version, like your file edits.";

const pathField = z
  .string()
  .trim()
  .max(PATH_MAX)
  .optional()
  .describe(
    "Page path. Leave out for the page of the frame in <canvas-context> (or the entry page)."
  );

const selectorField = z
  .string()
  .trim()
  .min(1)
  .max(SELECTOR_MAX)
  .optional()
  .describe("CSS selector or layer id of the text element on the live page.");

const listTextStylesInput = {
  limit: z
    .number()
    .int()
    .min(1)
    .max(TEXT_STYLE_LIST_MAX)
    .default(TEXT_STYLE_LIST_DEFAULT)
    .describe(`Most styles to return, up to ${TEXT_STYLE_LIST_MAX}.`),
  query: z
    .string()
    .trim()
    .max(TEXT_STYLE_QUERY_MAX)
    .optional()
    .describe('Part of a style name, for example "heading".'),
};

const applyTextStyleInput = {
  path: pathField,
  style: z
    .string()
    .trim()
    .regex(TEXT_STYLE_NAME)
    .describe('Text style name from list_text_styles, for example "xl".'),
  targetSelector: selectorField,
  targetSource: z
    .string()
    .trim()
    .max(SOURCE_MAX)
    .optional()
    .describe(
      'Or the element as file:line:col, for example "src/App.tsx:12:7".'
    ),
};

const createTextStyleInput = {
  name: z
    .string()
    .trim()
    .regex(TEXT_STYLE_NAME)
    .describe('New style name, for example "card-title".'),
  path: pathField,
  targetSelector: z
    .string()
    .trim()
    .min(1)
    .max(SELECTOR_MAX)
    .describe(
      "CSS selector or layer id of the element to copy text props from."
    ),
};

const listSchema = z.strictObject(listTextStylesInput);
const applySchema = z.strictObject(applyTextStyleInput);
const createSchema = z.strictObject(createTextStyleInput);

const reply = (message: string): ToolText => ({
  content: [{ text: message, type: "text" }],
});

const refuse = (message: string): ToolText => ({
  content: [{ text: message, type: "text" }],
  isError: true,
});

const issues = (tool: string, error: z.ZodError): ToolText => {
  const lines = error.issues.map(
    (issue) => `${issue.path.join(".") || "input"}: ${issue.message}`
  );

  return refuse(`${tool}: ${lines.join("; ")}`);
};

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
  args: z.input<typeof listSchema>
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
  input: z.output<typeof applySchema>
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
  args: z.input<typeof applySchema>
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
  input: z.output<typeof createSchema>
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
  input: z.output<typeof createSchema>
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
  args: z.input<typeof createSchema>
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

export {
  applyTextStyleInput,
  createTextStyleInput,
  listTextStylesInput,
  runApplyTextStyle,
  runCreateTextStyle,
  runListTextStyles,
};
