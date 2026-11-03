import type { ComponentSchema } from "../../../shared/props.js";

interface GalleryAxes {
  readonly hasDisabled: boolean;
  readonly sizeProp: string | null;
  readonly sizes: readonly string[];
  readonly variantProp: string | null;
  readonly variants: readonly string[];
}

interface AxisPick {
  readonly options: readonly string[];
  readonly prop: string;
}

const VARIANT_NAMES = ["variant", "intent", "kind", "tone", "appearance"];

const SIZE_NAMES = ["size"];

const MAX_VARIANTS = 12;

const MAX_SIZES = 6;

const optionsOfGroup = (
  schema: ComponentSchema,
  name: string
): readonly string[] => {
  const group = schema.cva?.variants.find((entry) => entry.prop === name);

  if (group) {
    return group.options.map((option) => option.value);
  }

  const spec = schema.props.find((entry) => entry.name === name);

  return spec?.options ?? [];
};

const pickAxis = (
  schema: ComponentSchema,
  names: readonly string[]
): AxisPick | null => {
  for (const name of names) {
    const options = optionsOfGroup(schema, name);

    if (options.length > 0) {
      return { options, prop: name };
    }
  }

  return null;
};

const toAxes = (schema: ComponentSchema | null): GalleryAxes => {
  if (schema === null) {
    return {
      hasDisabled: false,
      sizeProp: null,
      sizes: [],
      variantProp: null,
      variants: [],
    };
  }

  const variant = pickAxis(schema, VARIANT_NAMES);
  const size = pickAxis(schema, SIZE_NAMES);

  return {
    hasDisabled: schema.props.some((entry) => entry.name === "disabled"),
    sizeProp: size?.prop ?? null,
    sizes: (size?.options ?? []).slice(0, MAX_SIZES),
    variantProp: variant?.prop ?? null,
    variants: (variant?.options ?? []).slice(0, MAX_VARIANTS),
  };
};

export { toAxes };

export type { GalleryAxes };
