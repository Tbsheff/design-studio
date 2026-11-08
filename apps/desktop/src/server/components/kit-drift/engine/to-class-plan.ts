import {
  isColorToken,
  isLayoutToken,
  isSizeToken,
  isWithin,
  toClassTokens,
} from "./class-names.js";
import type { KitComponent, KitVariantGroup } from "./types.js";

interface ClassPlan {
  readonly dropped: readonly string[];
  readonly isLayoutOnly: boolean;
  readonly kept: readonly string[];
  readonly setSize: string | null;
  readonly setVariant: string | null;
  readonly suggestedSize: string | null;
  readonly suggestedVariant: string | null;
}

const VARIANT_PROP = "variant";
const SIZE_PROP = "size";

const getGroup = (kit: KitComponent, prop: string): KitVariantGroup | null =>
  kit.groups.find((group) => group.prop === prop) ?? null;

const getOption = (
  group: KitVariantGroup | null,
  raw: ReadonlySet<string>,
  isSignature: (token: string) => boolean
): string | null => {
  if (group === null) {
    return null;
  }

  let best: { readonly count: number; readonly value: string } | null = null;

  for (const option of group.options) {
    const signature = toClassTokens(option.classes).filter((token) =>
      isSignature(token)
    );

    const isBetter =
      signature.length > 0 &&
      isWithin(signature, raw) &&
      (best === null || signature.length > best.count);

    if (isBetter) {
      best = { count: signature.length, value: option.value };
    }
  }

  return best?.value ?? null;
};

const toChosenValue = (
  group: KitVariantGroup,
  variant: string | null,
  size: string | null
): string | null => {
  if (group.prop === VARIANT_PROP && variant !== null) {
    return variant;
  }

  if (group.prop === SIZE_PROP && size !== null) {
    return size;
  }

  return group.default;
};

const toEffective = (
  kit: KitComponent,
  variant: string | null,
  size: string | null
): Set<string> => {
  const tokens = new Set<string>(kit.base);

  for (const group of kit.groups) {
    const chosen = toChosenValue(group, variant, size);
    const option = group.options.find((entry) => entry.value === chosen);

    for (const token of toClassTokens(option?.classes ?? "")) {
      tokens.add(token);
    }
  }

  return tokens;
};

const toNonDefault = (
  group: KitVariantGroup | null,
  value: string | null
): string | null => {
  if (group === null || value === group.default) {
    return null;
  }

  return value;
};

const toClassPlan = (
  kit: KitComponent,
  tokens: readonly string[],
  hasVariants: boolean
): ClassPlan => {
  const raw = new Set(tokens);
  let variant: string | null = null;
  let size: string | null = null;

  if (hasVariants) {
    variant = getOption(getGroup(kit, VARIANT_PROP), raw, isColorToken);
    size = getOption(getGroup(kit, SIZE_PROP), raw, isSizeToken);
  }

  const effective = toEffective(kit, variant, size);
  const kept = tokens.filter((token) => !effective.has(token));
  const dropped = tokens.filter((token) => effective.has(token));
  const isLayoutOnly = kept.every((token) => isLayoutToken(token));
  const setSize = toNonDefault(getGroup(kit, SIZE_PROP), size);
  const setVariant = toNonDefault(getGroup(kit, VARIANT_PROP), variant);
  const suggestedSize = size;
  const suggestedVariant = variant;

  return {
    dropped,
    isLayoutOnly,
    kept,
    setSize,
    setVariant,
    suggestedSize,
    suggestedVariant,
  };
};

export { toClassPlan };

export type { ClassPlan };
