import { Schema } from "effect";

import {
  JSX_IMPORTS_MAX,
  JSX_INSERT_POSITIONS,
  JSX_SNIPPET_MAX,
} from "../../shared/actions/_core/insert.js";
import {
  toDefaulted,
  toOptional,
  toOptionalText,
  toSdkFieldSet,
  toToolInput,
  toTrimmedText,
} from "../agent-tools/index.js";
import type { ToolArgs } from "../agent-tools/index.js";
import { planClearText, planInsertJsx } from "../direct-edit/commit/index.js";
import { writeAtomic } from "../direct-edit/index.js";
import { refusal, writeProblem } from "./direct-tools.js";
import type { DirectToolDeps } from "./direct-tools.js";
import { targetOf } from "./insert-tool.js";

const IMPORT_FILE_MAX = 1000;

type ToolText = Readonly<{
  content: { type: "text"; text: string }[];
  isError?: boolean;
}>;

const importName = Schema.String.check(
  Schema.isPattern(/^[A-Z][A-Za-z0-9_$]{0,63}$/u)
);

const importFile = toTrimmedText(1, IMPORT_FILE_MAX);

const importCount = Schema.makeFilter(
  (value: Readonly<Record<string, string>>) =>
    Object.keys(value).length <= JSX_IMPORTS_MAX
);

const importRecord = Schema.Record(importName, importFile).check(importCount);

const insertJsxFields = {
  imports: toOptional(
    importRecord,
    "Only when two library components have the same name: name to component file."
  ),
  jsx: Schema.String.check(
    Schema.isMinLength(1),
    Schema.isMaxLength(JSX_SNIPPET_MAX)
  ).annotate({
    description:
      "JSX snippet: one or more elements with library components and token classes, for example <Card><CardHeader><CardTitle>Title</CardTitle></CardHeader></Card>. HTML in an HTML project.",
  }),
  path: toOptionalText(
    0,
    300,
    "Page path. Leave out for the page of the frame in <canvas-context> (or the entry page)."
  ),
  position: toDefaulted(
    Schema.Literals(JSX_INSERT_POSITIONS),
    "inside" as const,
    "inside: after the last child. before / after: a sibling. replace: in place of the target."
  ),
  targetSelector: toOptionalText(
    1,
    2000,
    "CSS selector of the target element on the live page."
  ),
  targetSource: toOptionalText(
    0,
    1100,
    'Or the target as file:line:col of its JSX tag, for example "src/App.tsx:12:7".'
  ),
};

export const insertJsxShape = toSdkFieldSet(insertJsxFields);

const schema = toToolInput(insertJsxFields);

function text(message: string, isError = false): ToolText {
  return {
    content: [{ text: message, type: "text" }],
    ...(isError ? { isError: true } : {}),
  };
}

export async function runInsertJsx(
  deps: DirectToolDeps,
  args: ToolArgs<typeof schema>
): Promise<ToolText> {
  const blocked = refusal(deps.ctx, "insert_jsx");

  if (blocked) {
    return text(blocked, true);
  }
  const parsed = schema.safeParse(args);

  if (!parsed.success) {
    return text(`insert_jsx: ${parsed.error}`, true);
  }
  const input = parsed.data;

  if (
    (input.targetSelector === undefined) ===
    (input.targetSource === undefined)
  ) {
    return text("Pass targetSelector or targetSource, not both.", true);
  }
  try {
    const target = await targetOf(deps, input);

    if (typeof target === "string") {
      return text(target, true);
    }
    const { project, direction, previewUrl } = deps.ctx;

    const previewOrigin =
      previewUrl && project.kind === "react"
        ? new URL(previewUrl).origin
        : null;

    const plan = await planInsertJsx(
      { previewOrigin, project, workTree: direction.workTree },
      {
        jsx: input.jsx,
        position: input.position,
        target,
        ...(input.imports ? { imports: input.imports } : {}),
      }
    );

    const problem = writeProblem(deps.ctx, plan.target.relative);

    if (problem) {
      return text(problem, true);
    }
    await writeAtomic(plan.target.file, plan.code);

    const at = plan.select
      .map((item) => `${item.file}:${item.line}:${item.col}`)
      .join(", ");

    const added = plan.imports
      .filter((item) => item.added)
      .map((item) => `${item.name} from "${item.specifier}"`);

    const imported =
      added.length > 0 ? ` Imports added: ${added.join(", ")}.` : "";

    return text(
      `${plan.title} at ${at}.${imported} The run saves this change in its version, like your file edits.`
    );
  } catch (error) {
    return text(
      `insert_jsx failed: ${error instanceof Error ? error.message : String(error)}`,
      true
    );
  }
}

const clearTextFields = {
  path: insertJsxFields.path,
  targetSelector: insertJsxFields.targetSelector,
  targetSource: insertJsxFields.targetSource,
};

export const clearTextShape = toSdkFieldSet(clearTextFields);

const clearSchema = toToolInput(clearTextFields);

export async function runClearText(
  deps: DirectToolDeps,
  args: ToolArgs<typeof clearSchema>
): Promise<ToolText> {
  const blocked = refusal(deps.ctx, "clear_text");

  if (blocked) {
    return text(blocked, true);
  }
  const parsed = clearSchema.safeParse(args);

  if (!parsed.success) {
    return text(`clear_text: ${parsed.error}`, true);
  }
  if (
    (parsed.data.targetSelector === undefined) ===
    (parsed.data.targetSource === undefined)
  ) {
    return text("Pass targetSelector or targetSource, not both.", true);
  }
  try {
    const target = await targetOf(deps, parsed.data);

    if (typeof target === "string") {
      return text(target, true);
    }
    const { project, direction, previewUrl } = deps.ctx;

    const previewOrigin =
      previewUrl && project.kind === "react"
        ? new URL(previewUrl).origin
        : null;

    const plan = await planClearText(
      { previewOrigin, project, workTree: direction.workTree },
      { target }
    );

    const problem = writeProblem(deps.ctx, plan.target.relative);

    if (problem) {
      return text(problem, true);
    }
    await writeAtomic(plan.target.file, plan.code);
    const at = plan.select[0];

    return text(
      `${plan.title} at ${plan.target.relative}:${at?.line ?? "?"}. The run saves this change in its version, like your file edits.`
    );
  } catch (error) {
    return text(
      `clear_text failed: ${error instanceof Error ? error.message : String(error)}`,
      true
    );
  }
}
