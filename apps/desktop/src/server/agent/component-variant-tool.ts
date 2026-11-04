import { Effect, Schema } from "effect";

import {
  VARIANT_CLASSES,
  VARIANT_KEY,
  VARIANT_VALUE,
} from "../../shared/component-variant.js";
import type { ComponentVariantChange } from "../../shared/component-variant.js";
import {
  toOptionalText,
  toSdkFieldSet,
  toToolInput,
  toTrimmedText,
} from "../agent-tools/index.js";
import type { ToolArgs, ToolParse } from "../agent-tools/index.js";
import type { VariantScope } from "../components/variant-write/locate.js";
import type { VariantPlan } from "../components/variant-write/plan.js";
import { planVariantWrite } from "../components/variant-write/plan.js";
import {
  previewVariant,
  toVariantResult,
} from "../components/variant-write/write.js";
import type { VariantPreview } from "../components/variant-write/write.js";
import { writeAtomic } from "../direct-edit/commit/index.js";
import {
  createChange,
  hasComponent,
  targetOf,
  updateChange,
} from "../mcp/component-variant-tools.js";
import { refusal, writeProblem } from "./direct-tools.js";
import type { DirectToolDeps } from "./direct-tools.js";

type ToolContent =
  | { data: string; mimeType: string; type: "image" }
  | { text: string; type: "text" };

interface ToolReply {
  [key: string]: boolean | ToolContent[] | undefined;
  content: ToolContent[];
  isError?: boolean;
}

const CVA_NAME_MAX = 64;
const FILE_MAX = 1000;
const CLASSES_MAX = 10_000;

const RUN_NOTE =
  "The run saves this change in its version, like your file edits.";

const componentFields = {
  cva: Schema.optionalKey(
    toTrimmedText(0, CVA_NAME_MAX)
      .check(Schema.isPattern(/^[A-Za-z_$][\w$]{0,63}$/u))
      .annotate({
        description:
          "Name of the cva() const, for example buttonVariants, when the file has more than one.",
      })
  ),
  file: toOptionalText(
    0,
    FILE_MAX,
    "File of the component, relative to the project, when two components have the same name."
  ),
  name: Schema.optionalKey(
    Schema.String.check(
      Schema.isPattern(/^[A-Z][A-Za-z0-9_$]{0,63}$/u)
    ).annotate({
      description: 'Component name from list_components, for example "Button".',
    })
  ),
};

const key = Schema.String.check(Schema.isPattern(VARIANT_KEY)).annotate({
  description:
    'Variant key of the cva() variants map, for example "variant" or "size".',
});

const value = Schema.String.check(Schema.isPattern(VARIANT_VALUE)).annotate({
  description: 'Value name in that key, for example "danger" or "xl".',
});

const classes = toTrimmedText(1, CLASSES_MAX)
  .check(Schema.isPattern(VARIANT_CLASSES))
  .annotate({
    description:
      'Tailwind classes of the value, for example "bg-red-600 text-white hover:bg-red-700".',
  });

const setDefault = Schema.Boolean.annotate({
  default: false,
  description: "Also make this value the default in defaultVariants.",
}).pipe(Schema.withDecodingDefaultKey(Effect.succeed(false)));

const createFields = {
  ...componentFields,
  classes: Schema.optionalKey(classes),
  copyFrom: Schema.optionalKey(
    value.annotate({
      description:
        "Existing value in the same key to copy. Its classes come first; classes then replace the ones of the same utility.",
    })
  ),
  key,
  newKey: Schema.Boolean.annotate({
    default: false,
    description:
      "Add the key when the variants map does not have it. The new value becomes its default.",
  }).pipe(Schema.withDecodingDefaultKey(Effect.succeed(false))),
  setDefault,
  value,
};

const updateFields = {
  ...componentFields,
  classes: Schema.optionalKey(
    classes.annotate({
      description:
        "New classes for the value. They replace all of its classes.",
    })
  ),
  key,
  rename: Schema.optionalKey(
    value.annotate({
      description:
        "New name for the value. defaultVariants and compoundVariants follow it.",
    })
  ),
  setDefault,
  value,
};

type CreateFields = Schema.Struct.Type<typeof createFields>;

type UpdateFields = Schema.Struct.Type<typeof updateFields>;

const createVariantInput = toSdkFieldSet(createFields);

const updateVariantInput = toSdkFieldSet(updateFields);

const createSchema = toToolInput(createFields);
const updateSchema = toToolInput(updateFields);

const refuse = (message: string): ToolReply => ({
  content: [{ text: message, type: "text" }],
  isError: true,
});

const issues = (tool: string, error: string): ToolReply =>
  refuse(`${tool}: ${error}`);

const caught = (tool: string, error: Error | null): ToolReply => {
  if (error instanceof Error) {
    return refuse(`${tool} failed: ${error.message}`);
  }

  return refuse(`${tool} failed: ${String(error)}`);
};

const scopeOf = (deps: DirectToolDeps): VariantScope => ({
  direction: deps.ctx.direction,
  project: deps.ctx.project,
  workTree: deps.ctx.direction.workTree,
});

const imageOf = (preview: VariantPreview): ToolContent[] => {
  if (!preview.ok) {
    return [];
  }

  return [
    {
      data: preview.png.toString("base64"),
      mimeType: "image/png",
      type: "image",
    },
  ];
};

const writeAll = async (
  deps: DirectToolDeps,
  plan: VariantPlan
): Promise<string | null> => {
  const problem = plan.written
    .map((entry) => writeProblem(deps.ctx, entry.target.relative))
    .find((entry) => entry !== null);

  if (problem) {
    return problem;
  }

  await Promise.all(
    plan.written.map((entry) => writeAtomic(entry.target.file, entry.code))
  );

  return null;
};

const writeWith = async (
  deps: DirectToolDeps,
  input: CreateFields | UpdateFields,
  change: ComponentVariantChange
): Promise<ToolReply> => {
  const scope = scopeOf(deps);

  const plan = await planVariantWrite(scope, {
    change,
    target: targetOf(input),
  });

  const problem = await writeAll(deps, plan);

  if (problem) {
    return refuse(problem);
  }

  const preview = await previewVariant(deps.preview, scope, plan);
  const result = JSON.stringify(toVariantResult(plan, null, preview));

  return {
    content: [
      ...imageOf(preview),
      { text: `${plan.title}. ${RUN_NOTE} ${result}`, type: "text" },
    ],
  };
};

const preflight = (deps: DirectToolDeps, tool: string): string | null => {
  const blocked = refusal(deps.ctx, tool);

  if (blocked) {
    return blocked;
  }

  if (deps.ctx.project.kind !== "react") {
    return "This is an HTML project. It has no component kit.";
  }

  return null;
};

const runVariantWrite = async <Fields extends CreateFields | UpdateFields>(
  deps: DirectToolDeps,
  tool: string,
  parsed: ToolParse<Fields>,
  changeOf: (input: Fields) => ComponentVariantChange
): Promise<ToolReply> => {
  const blocked = preflight(deps, tool);

  if (blocked) {
    return refuse(blocked);
  }

  if (!parsed.success) {
    return issues(tool, parsed.error);
  }

  if (!hasComponent(parsed.data)) {
    return refuse("Pass the component name or its file.");
  }

  try {
    return await writeWith(deps, parsed.data, changeOf(parsed.data));
  } catch (error) {
    return caught(tool, error as Error | null);
  }
};

const runCreateComponentVariant = (
  deps: DirectToolDeps,
  args: ToolArgs<typeof createSchema>
): Promise<ToolReply> =>
  runVariantWrite(
    deps,
    "create_component_variant",
    createSchema.safeParse(args),
    createChange
  );

const runUpdateComponentVariant = (
  deps: DirectToolDeps,
  args: ToolArgs<typeof updateSchema>
): Promise<ToolReply> =>
  runVariantWrite(
    deps,
    "update_component_variant",
    updateSchema.safeParse(args),
    updateChange
  );

export {
  createVariantInput,
  runCreateComponentVariant,
  runUpdateComponentVariant,
  updateVariantInput,
};
