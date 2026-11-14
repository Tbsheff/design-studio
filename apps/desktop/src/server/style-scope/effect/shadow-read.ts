import { parseClass } from "./deps.js";
import type { EffectItem } from "./deps.js";
import {
  fromShadowClass,
  fromVariantDeclarations,
  fromVariantToken,
  toSizes,
} from "./engine/index.js";
import type { EffectDeclaration, ShadowScale } from "./engine/index.js";

interface ShadowSizeFields {
  readonly innerShadowSizes: ReturnType<typeof toSizes>;
  readonly shadowSizes: ReturnType<typeof toSizes>;
}

const BOX_SHADOW = "box-shadow";

const toClassDeclaration = (
  base: string,
  isShadowOnly: boolean
): EffectDeclaration | null => {
  const declaration = fromVariantToken(base);

  if (declaration === null) {
    return null;
  }

  if (isShadowOnly && declaration.property !== BOX_SHADOW) {
    return null;
  }

  return declaration;
};

const toClassEffects = (
  classes: readonly string[],
  variant: string,
  scale: ShadowScale,
  isShadowOnly: boolean
): EffectItem[] => {
  const named: EffectItem[] = [];
  const declarations: EffectDeclaration[] = [];

  for (const token of classes) {
    const parsed = parseClass(token);
    const base = token.slice(parsed.variants.length);
    const item = fromShadowClass(base, scale);
    const declaration = toClassDeclaration(base, isShadowOnly);

    if (parsed.variants === variant && item !== null) {
      named.push(item);
    }

    if (parsed.variants === variant && item === null && declaration !== null) {
      declarations.push(declaration);
    }
  }

  return [...named, ...fromVariantDeclarations(declarations, scale)];
};

const toSizeFields = (scale: ShadowScale): ShadowSizeFields => ({
  innerShadowSizes: toSizes(scale, "inner-shadow"),
  shadowSizes: toSizes(scale, "drop-shadow"),
});

export { toClassEffects, toSizeFields };

export type { ShadowSizeFields };
