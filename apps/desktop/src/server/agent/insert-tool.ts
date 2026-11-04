import { INSERT_TEXT_MAX } from "@design-studio/contracts/insert";
import type { InsertTarget } from "@design-studio/contracts/insert";
import {
  PROP_NAME,
  PROP_TEXT_MAX,
  PROPS_MAX,
} from "@design-studio/contracts/props";
import { Schema } from "effect";

import {
  toDefaulted,
  toOptional,
  toOptionalText,
  toSdkFieldSet,
  toToolInput,
} from "../agent-tools/index.js";
import type { ToolArgs } from "../agent-tools/index.js";
import { planInsertComponent } from "../direct-edit/components-ops/index.js";
import { writeAtomic } from "../direct-edit/index.js";
import { describeElements, probeOwners } from "../page-probe/index.js";
import { refusal, writeProblem } from "./direct-tools.js";
import type { DirectToolDeps } from "./direct-tools.js";
import { editPageUrl } from "./run-target.js";

type ToolText = Readonly<{
  content: { type: "text"; text: string }[];
  isError?: boolean;
}>;

const LOC = /^(.+):(\d+):(\d+)$/;

const propName = Schema.String.check(Schema.isPattern(PROP_NAME));

const propText = Schema.String.check(Schema.isMaxLength(PROP_TEXT_MAX));

const propValue = Schema.Union([propText, Schema.Finite, Schema.Boolean]);

const insertComponentFields = {
  file: toOptionalText(
    0,
    1000,
    "File of the component when two components have the same name."
  ),
  name: Schema.String.check(
    Schema.isPattern(/^[A-Z][A-Za-z0-9_$]{0,63}$/u)
  ).annotate({
    description:
      'Component name from the project library, for example "Button".',
  }),
  path: toOptionalText(
    0,
    300,
    "Page path. Leave out for the page of the frame in <canvas-context> (or the entry page)."
  ),
  position: toDefaulted(
    Schema.Literals(["inside", "after"]),
    "inside" as const,
    "inside: last child of the target. after: next sibling."
  ),
  props: toOptional(
    Schema.Record(propName, propValue),
    `Up to ${PROPS_MAX} props, for example {"variant": "outline"}.`
  ),
  targetSelector: toOptionalText(
    1,
    2000,
    "CSS selector of the element on the live page to insert inside or after."
  ),
  targetSource: toOptionalText(
    0,
    1100,
    'Or the target as file:line:col of its JSX tag, for example "src/App.tsx:12:7".'
  ),
  text: toOptional(
    Schema.String.check(Schema.isMaxLength(INSERT_TEXT_MAX)),
    'Child text, for example "Save".'
  ),
};

export const insertComponentShape = toSdkFieldSet(insertComponentFields);

const schema = toToolInput(insertComponentFields);

function text(message: string, isError = false): ToolText {
  return {
    content: [{ text: message, type: "text" }],
    ...(isError ? { isError: true } : {}),
  };
}

export async function targetOf(
  deps: DirectToolDeps,
  input: {
    targetSelector?: string | undefined;
    targetSource?: string | undefined;
    path?: string | undefined;
  }
): Promise<InsertTarget | string> {
  if (input.targetSource) {
    const match = LOC.exec(input.targetSource);

    return match
      ? {
          source: {
            col: Number(match[3]),
            file: match[1] as string,
            line: Number(match[2]),
          },
        }
      : "targetSource must be file:line:col.";
  }

  if (!input.targetSelector) {
    return "Pass targetSelector or targetSource.";
  }
  if (!deps.ctx.previewUrl) {
    return "Preview is not running for this direction. Pass targetSource instead.";
  }
  const url = editPageUrl(deps.ctx, input.path);

  const [element] = await describeElements(deps.preview, url, [
    input.targetSelector,
  ]);

  if (!element) {
    return `No element matches ${input.targetSelector} on the page.`;
  }
  const probed = await probeOwners(
    deps.preview,
    url,
    input.targetSelector
  ).catch(() => null);

  if (!element.source && !probed?.owners.length) {
    return `${input.targetSelector} has no source location on the page. Pass targetSource instead.`;
  }
  return {
    source: element.source,
    tag: element.tag,
    ...(probed?.owners.length ? { owners: probed.owners } : {}),
  };
}

export async function runInsertComponent(
  deps: DirectToolDeps,
  args: ToolArgs<typeof schema>
): Promise<ToolText> {
  const blocked = refusal(deps.ctx, "insert_component");

  if (blocked) {
    return text(blocked, true);
  }
  const parsed = schema.safeParse(args);

  if (!parsed.success) {
    return text(`insert_component: ${parsed.error}`, true);
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

    const request = {
      component: {
        name: input.name,
        ...(input.file ? { file: input.file } : {}),
      },
      position: input.position,
      target,
      ...(input.props ? { props: input.props } : {}),
      ...(input.text === undefined ? {} : { text: input.text }),
    };

    const plan = await planInsertComponent(
      { previewOrigin, project, workTree: direction.workTree },
      request
    );

    const problem = writeProblem(deps.ctx, plan.target.relative);

    if (problem) {
      return text(problem, true);
    }
    await writeAtomic(plan.target.file, plan.code);
    const at = plan.select[0];

    const imported = plan.importAdded
      ? ` Import from "${plan.importFrom}" added.`
      : "";

    return text(
      `${plan.title}: ${plan.jsx} at ${plan.target.relative}:${at?.line ?? "?"}.${imported} The run saves this change in its version, like your file edits.`
    );
  } catch (error) {
    return text(
      `insert_component failed: ${error instanceof Error ? error.message : String(error)}`,
      true
    );
  }
}
