import { z } from "zod";

import {
  VARIANT_CLASSES,
  VARIANT_KEY,
  VARIANT_VALUE,
} from "../../shared/component-variant.js";
import type {
  ComponentVariantChange,
  ComponentVariantTarget,
} from "../../shared/component-variant.js";
import { ComponentVariantError } from "../components/variant-write/errors.js";
import type { VariantScope } from "../components/variant-write/locate.js";
import {
  previewVariant,
  toVariantResult,
  writeVariant,
} from "../components/variant-write/write.js";
import type { VariantPreview } from "../components/variant-write/write.js";
import { EditError, loadTarget, refuseWhileRunning } from "./edit-deps.js";
import type { EditDeps } from "./edit-deps.js";
import {
  defineTool,
  directionId as directionIdSchema,
  projectId as projectIdSchema,
  versionActivity,
} from "./edit-kit.js";
import type { Done } from "./edit-kit.js";

const FILE_MAX = 1000;

const componentFields = {
  cva: z
    .string()
    .trim()
    .regex(/^[A-Za-z_$][\w$]{0,63}$/u)
    .optional()
    .describe(
      "Name of the cva() const, for example buttonVariants, when the file has more than one."
    ),
  file: z
    .string()
    .trim()
    .max(FILE_MAX)
    .optional()
    .describe(
      "File of the component, relative to the project, when two components have the same name."
    ),
  name: z
    .string()
    .regex(/^[A-Z][A-Za-z0-9_$]{0,63}$/u)
    .optional()
    .describe('Component name from list_components, for example "Button".'),
};

const key = z
  .string()
  .regex(VARIANT_KEY)
  .describe(
    'Variant key of the cva() variants map, for example "variant" or "size".'
  );

const value = z
  .string()
  .regex(VARIANT_VALUE)
  .describe('Value name in that key, for example "danger" or "xl".');

const classes = z
  .string()
  .trim()
  .min(1)
  .regex(VARIANT_CLASSES)
  .describe(
    'Tailwind classes of the value, for example "bg-red-600 text-white hover:bg-red-700".'
  );

const setDefault = z
  .boolean()
  .default(false)
  .describe("Also make this value the default in defaultVariants.");

const hasComponent = (input: {
  file?: string | undefined;
  name?: string | undefined;
}): boolean => Boolean(input.file) || Boolean(input.name);

const COMPONENT_RULE = "pass name or file";

const createFields = {
  classes: classes.optional(),
  copyFrom: value
    .optional()
    .describe(
      "Existing value in the same key to copy. Its classes come first; classes then replace the ones of the same utility."
    ),
  key,
  newKey: z
    .boolean()
    .default(false)
    .describe(
      "Add the key when the variants map does not have it. The new value becomes its default."
    ),
  setDefault,
  value,
  ...componentFields,
};

const updateFields = {
  classes: classes
    .optional()
    .describe("New classes for the value. They replace all of its classes."),
  key,
  rename: value
    .optional()
    .describe(
      "New name for the value. defaultVariants and compoundVariants follow it."
    ),
  setDefault,
  value,
  ...componentFields,
};

const createSchema = z
  .strictObject({
    directionId: directionIdSchema,
    projectId: projectIdSchema,
    ...createFields,
  })
  .refine(hasComponent, COMPONENT_RULE);

const updateSchema = z
  .strictObject({
    directionId: directionIdSchema,
    projectId: projectIdSchema,
    ...updateFields,
  })
  .refine(hasComponent, COMPONENT_RULE);

type CreateFields = z.output<z.ZodObject<typeof createFields>>;

type UpdateFields = z.output<z.ZodObject<typeof updateFields>>;

type CreateInput = z.output<typeof createSchema>;

type UpdateInput = z.output<typeof updateSchema>;

const targetOf = (
  input: CreateFields | UpdateFields
): ComponentVariantTarget => ({
  cva: input.cva ?? null,
  file: input.file ?? null,
  name: input.name ?? null,
});

const createChange = (input: CreateFields): ComponentVariantChange => ({
  classes: input.classes ?? null,
  copyFrom: input.copyFrom ?? null,
  key: input.key,
  kind: "create",
  newKey: input.newKey,
  setDefault: input.setDefault,
  value: input.value,
});

const updateChange = (input: UpdateFields): ComponentVariantChange => ({
  classes: input.classes ?? null,
  key: input.key,
  kind: "update",
  rename: input.rename ?? null,
  setDefault: input.setDefault,
  value: input.value,
});

const guarded = async <Result>(
  work: () => Promise<Result>
): Promise<Result> => {
  try {
    return await work();
  } catch (error) {
    if (error instanceof ComponentVariantError) {
      throw new EditError(error.message);
    }

    throw error;
  }
};

const editScope = async (
  deps: EditDeps,
  projectId: string,
  directionId: string
): Promise<VariantScope> => {
  const found = await loadTarget(deps, projectId, directionId);

  refuseWhileRunning(deps, found.project, found.direction);

  if (found.project.kind !== "react") {
    throw new EditError("This is an HTML project. It has no component kit.");
  }

  return {
    direction: found.direction,
    project: found.project,
    workTree: found.direction.workTree,
  };
};

interface ImageContent {
  readonly data: string;
  readonly mimeType: string;
  readonly type: "image";
}

const imageOf = (preview: VariantPreview): ImageContent[] => {
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

const runWrite = async (
  deps: EditDeps,
  input: CreateInput | UpdateInput,
  change: ComponentVariantChange
): Promise<Done> => {
  const scope = await editScope(deps, input.projectId, input.directionId);

  const { plan, version } = await guarded(() =>
    writeVariant(deps, scope, { change, target: targetOf(input) })
  );

  const preview = await previewVariant(deps.preview, scope, plan);
  const result = toVariantResult(plan, version, preview);

  return {
    activity: versionActivity(
      scope.project,
      scope.direction,
      plan.title,
      version
    ),
    result: {
      content: [
        ...imageOf(preview),
        { text: JSON.stringify(result, null, 2), type: "text" },
      ],
    },
  };
};

const createVariantTool = defineTool(
  "create_component_variant",
  createSchema,
  {
    description:
      "Add a value to the cva() variants map of one kit component, for example Button variant danger with its Tailwind classes. copyFrom starts from an existing value. newKey: true adds a new variant key with this value as its default. setDefault: true also sets defaultVariants. Only the cva() call changes; other code in the file stays the same. Refuses a component with no cva(). One version and one undo step. Returns the new value list and a component_preview PNG of the new value.",
    title: "Create component variant",
  },
  (deps, input): Promise<Done> => runWrite(deps, input, createChange(input))
);

const updateVariantTool = defineTool(
  "update_component_variant",
  updateSchema,
  {
    description:
      "Rename a value of the cva() variants map of one kit component, or replace its Tailwind classes, or make it the default. A rename also changes defaultVariants and compoundVariants that name the value; uses of the old name in pages do not change. Only the cva() call changes. One version and one undo step. Returns the value list and a component_preview PNG of the value.",
    title: "Update component variant",
  },
  (deps, input): Promise<Done> => runWrite(deps, input, updateChange(input))
);

const COMPONENT_VARIANT_TOOLS = [createVariantTool, updateVariantTool];

export {
  COMPONENT_VARIANT_TOOLS,
  createChange,
  createFields,
  hasComponent,
  targetOf,
  updateChange,
  updateFields,
};

export type { CreateFields, UpdateFields };
