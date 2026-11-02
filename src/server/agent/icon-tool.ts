import { z } from "zod";

import {
  ICON_COLOR,
  ICON_LIST_DEFAULT,
  ICON_LIST_MAX,
  ICON_NAME,
  ICON_PATH_MAX,
  ICON_POSITIONS,
  ICON_QUERY_MAX,
  ICON_SIZE_DEFAULT,
  ICON_SIZE_MAX,
  ICON_SIZE_MIN,
  ICON_SOURCE_MAX,
  ICON_SOURCES,
  ICON_TARGET_MAX,
} from "../../shared/icons.js";
import type { InsertTarget } from "../../shared/insert.js";
import { writeAtomic } from "../direct-edit/index.js";
import { planIconInsert } from "../icons/insert.js";
import type { IconInsertPlan } from "../icons/insert.js";
import { listIcons } from "../icons/list.js";
import { refusal, writeProblem } from "./direct-tools.js";
import type { DirectToolDeps } from "./direct-tools.js";
import { targetOf } from "./insert-tool.js";

interface ToolContent {
  text: string;
  type: "text";
}

interface ToolText {
  [key: string]: boolean | ToolContent[] | undefined;
  content: ToolContent[];
  isError?: boolean;
}

type TargetFound =
  | { message: string; ok: false }
  | { ok: true; target: InsertTarget };

const librarySchema = z
  .enum(ICON_SOURCES)
  .optional()
  .describe(
    'Icon library. Leave out for the one the project has installed, or the bundled lucide set ("lucide").'
  );

const listIconsInput = {
  library: librarySchema,
  limit: z
    .number()
    .int()
    .min(1)
    .max(ICON_LIST_MAX)
    .default(ICON_LIST_DEFAULT)
    .describe(`Most icons to return, up to ${ICON_LIST_MAX}.`),
  query: z
    .string()
    .trim()
    .max(ICON_QUERY_MAX)
    .optional()
    .describe('Part of an icon name, for example "search".'),
};

const insertIconInput = {
  color: z
    .string()
    .trim()
    .regex(ICON_COLOR)
    .optional()
    .describe('Color token name, for example "primary".'),
  library: librarySchema,
  name: z
    .string()
    .trim()
    .regex(ICON_NAME)
    .describe('Icon name from list_icons, for example "search".'),
  path: z
    .string()
    .trim()
    .max(ICON_PATH_MAX)
    .optional()
    .describe(
      "Page path. Leave out for the page of the frame in <canvas-context> (or the entry page)."
    ),
  position: z
    .enum(ICON_POSITIONS)
    .default("inside")
    .describe("inside: last child of the target. before / after: a sibling."),
  size: z
    .number()
    .int()
    .min(ICON_SIZE_MIN)
    .max(ICON_SIZE_MAX)
    .default(ICON_SIZE_DEFAULT)
    .describe("Size in px."),
  targetSelector: z
    .string()
    .trim()
    .min(1)
    .max(ICON_TARGET_MAX)
    .optional()
    .describe("CSS selector of the target element on the live page."),
  targetSource: z
    .string()
    .trim()
    .max(ICON_SOURCE_MAX)
    .optional()
    .describe(
      'Or the target as file:line:col of its JSX tag, for example "src/App.tsx:12:7".'
    ),
};

const listSchema = z.strictObject(listIconsInput);
const insertSchema = z.strictObject(insertIconInput);

type InsertInput = z.output<typeof insertSchema>;

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

const findTarget = async (
  deps: DirectToolDeps,
  input: InsertInput
): Promise<TargetFound> => {
  const found = await targetOf(deps, input);

  if (found instanceof Object) {
    return { ok: true, target: found };
  }

  return { message: found, ok: false };
};

const writtenText = (plan: IconInsertPlan): string => {
  const [at] = plan.select;

  const parts = [
    `${plan.title}: ${plan.markup.slice(0, ICON_QUERY_MAX)} at ${plan.target.relative}:${at?.line ?? "?"}.`,
  ];

  if (plan.importAdded) {
    parts.push(`Import from "${plan.importFrom ?? ""}" added.`);
  }

  parts.push("The run saves this change in its version, like your file edits.");

  return parts.join(" ");
};

const previewOriginOf = (deps: DirectToolDeps): string | null => {
  const { previewUrl, project } = deps.ctx;

  if (!previewUrl || project.kind !== "react") {
    return null;
  }

  return new URL(previewUrl).origin;
};

const insertWith = async (
  deps: DirectToolDeps,
  input: InsertInput,
  target: InsertTarget
): Promise<ToolText> => {
  const scope = {
    previewOrigin: previewOriginOf(deps),
    project: deps.ctx.project,
    workTree: deps.ctx.direction.workTree,
  };

  const plan = await planIconInsert(scope, {
    color: input.color,
    library: input.library,
    name: input.name,
    position: input.position,
    size: input.size,
    target,
  });

  const problem = writeProblem(deps.ctx, plan.target.relative);

  if (problem) {
    return refuse(problem);
  }

  await writeAtomic(plan.target.file, plan.code);

  return reply(writtenText(plan));
};

const runListIcons = async (
  deps: DirectToolDeps,
  args: z.input<typeof listSchema>
): Promise<ToolText> => {
  const parsed = listSchema.safeParse(args);

  if (!parsed.success) {
    return issues("list_icons", parsed.error);
  }

  const { direction, project } = deps.ctx;

  try {
    const list = await listIcons(
      { project, workTree: direction.workTree },
      parsed.data
    );

    return reply(JSON.stringify(list, null, 2));
  } catch (error) {
    if (error instanceof Error) {
      return failure("list_icons", error);
    }

    return failure("list_icons", String(error));
  }
};

const runInsertIcon = async (
  deps: DirectToolDeps,
  args: z.input<typeof insertSchema>
): Promise<ToolText> => {
  const blocked = refusal(deps.ctx, "insert_icon");

  if (blocked) {
    return refuse(blocked);
  }

  const parsed = insertSchema.safeParse(args);

  if (!parsed.success) {
    return issues("insert_icon", parsed.error);
  }

  const input = parsed.data;

  if (Boolean(input.targetSelector) === Boolean(input.targetSource)) {
    return refuse("Pass targetSelector or targetSource, not both.");
  }

  try {
    const found = await findTarget(deps, input);

    if (!found.ok) {
      return refuse(found.message);
    }

    return await insertWith(deps, input, found.target);
  } catch (error) {
    if (error instanceof Error) {
      return failure("insert_icon", error);
    }

    return failure("insert_icon", String(error));
  }
};

export { insertIconInput, listIconsInput, runInsertIcon, runListIcons };
