import {
  PROP_NAME,
  PROP_TEXT_MAX,
  PROPS_MAX,
} from "@design-studio/contracts/props";
import { Schema } from "effect";

import {
  toOptionalText,
  toSdkFieldSet,
  toToolInput,
} from "../agent-tools/index.js";
import type { ToolArgs, ToolDecoded } from "../agent-tools/index.js";
import { resolveInstance } from "../components/use-site.js";
import { parseSetProps, planSetProps } from "../direct-edit/commit/index.js";
import { writeAtomic } from "../direct-edit/index.js";
import { probeOwners } from "../page-probe/index.js";
import { refusal, writeProblem } from "./direct-tools.js";
import type { DirectToolDeps } from "./direct-tools.js";
import { editPageUrl } from "./run-target.js";

type ToolText = Readonly<{
  content: { type: "text"; text: string }[];
  isError?: boolean;
}>;

const LOC = /^(.+):(\d+):(\d+)$/;

const propValue = Schema.Union([
  Schema.String.check(Schema.isMaxLength(PROP_TEXT_MAX)),
  Schema.Finite,
  Schema.Boolean,
  Schema.Null,
]);

const propName = Schema.String.check(Schema.isPattern(PROP_NAME));

const setPropsFields = {
  path: toOptionalText(
    0,
    300,
    "Page path. Leave out for the page of the frame in <canvas-context> (or the entry page)."
  ),
  props: Schema.Record(propName, propValue).annotate({
    description: `1 to ${PROPS_MAX} props. null removes a prop; a value equal to the default removes the attribute.`,
  }),
  selector: toOptionalText(
    1,
    2000,
    "CSS selector of an element inside the component instance on the live page. The nearest component with props (such as <Button>) is changed."
  ),
  source: toOptionalText(
    0,
    1100,
    'Or the use site as file:line:col of the JSX tag, for example "src/App.tsx:14:9".'
  ),
};

export const setPropsShape = toSdkFieldSet(setPropsFields);

const schema = toToolInput(setPropsFields);

function text(message: string, isError = false): ToolText {
  return {
    content: [{ text: message, type: "text" }],
    ...(isError ? { isError: true } : {}),
  };
}

async function useSite(
  deps: DirectToolDeps,
  input: ToolDecoded<typeof schema>
): Promise<{ file: string; line: number; col: number } | string> {
  if (input.source) {
    const match = LOC.exec(input.source);

    return match
      ? {
          col: Number(match[3]),
          file: match[1] as string,
          line: Number(match[2]),
        }
      : "source must be file:line:col.";
  }

  if (!input.selector) {
    return "Pass selector or source.";
  }

  if (!deps.ctx.previewUrl) {
    return "Preview is not running for this direction. Pass source instead.";
  }

  const probed = await probeOwners(
    deps.preview,
    editPageUrl(deps.ctx, input.path),
    input.selector
  );

  if (!probed) {
    return `No element matches ${input.selector} on the page.`;
  }

  const instance = await resolveInstance(
    {
      previewOrigin: new URL(deps.ctx.previewUrl).origin,
      workTree: deps.ctx.direction.workTree,
    },
    { owners: probed.owners, usedAt: probed.usedAt }
  );

  return instance
    ? instance.use
    : `${input.selector} is not inside a component instance with props. Pass source (file:line:col of the JSX tag) or edit the JSX instead.`;
}

export async function runSetProps(
  deps: DirectToolDeps,
  args: ToolArgs<typeof schema>
): Promise<ToolText> {
  const blocked = refusal(deps.ctx, "set_props");

  if (blocked) {
    return text(blocked, true);
  }

  const parsed = schema.safeParse(args);

  if (!parsed.success) {
    return text(`set_props: ${parsed.error}`, true);
  }

  try {
    const source = await useSite(deps, parsed.data);

    if (typeof source === "string") {
      return text(source, true);
    }

    const request = parseSetProps({ props: parsed.data.props, source });

    const { target, original, instance, plan } = await planSetProps(
      deps.ctx.direction.workTree,
      request
    );

    const problem = writeProblem(deps.ctx, target.relative);

    if (problem) {
      return text(problem, true);
    }

    if (plan.code === original) {
      return text(
        `<${instance.tag}> at ${target.relative}:${instance.use.line} already has these props.`
      );
    }

    await writeAtomic(target.file, plan.code);

    const parts = [
      ...plan.changed.map(
        (name) => `${name}=${JSON.stringify(parsed.data.props[name])}`
      ),
      ...plan.removed.map((name) => `removed ${name}`),
    ];

    return text(
      `Set <${instance.tag}> ${parts.join(", ")} at ${target.relative}:${instance.use.line}. The run saves this change in its version, like your file edits.`
    );
  } catch (error) {
    return text(
      `set_props failed: ${error instanceof Error ? error.message : String(error)}`,
      true
    );
  }
}
