import type { EffectItem } from "@design-studio/actions/effect/schema";

import { toEffectDeclarations } from "./compile.js";
import type { EffectDeclaration } from "./compile.js";
import { toShadowItem, toSplitTopLevel } from "./shadow-parse.js";
import {
  fromShadowVar,
  isShadowClass,
  isShadowItem,
  toScaledEffects,
} from "./shadow-scale.js";
import type { ShadowScale } from "./shadow-scale.js";
import { toShadowTokens } from "./shadow-tokens.js";

const BOX_SHADOW = "box-shadow";

const FILTER = "filter";

const BACKDROP = "backdrop-filter";

const NONE = "none";

const PERCENT = "%";

const BLUR_RE = /blur\((?<radius>-?[\d.]+)px\)/u;

const SATURATE_RE = /saturate\((?<amount>[\d.]+)%?\)/u;

const ARBITRARY_RE = /^(?<name>[a-z-]+)-\[(?<value>[^\]]+)\]$/u;

const SHADOW_BASES: readonly string[] = ["shadow", "inset-shadow"];

const EFFECT_BASES: readonly string[] = [
  "blur",
  "backdrop-blur",
  "backdrop-saturate",
  "drop-shadow",
];

const SATURATE_FULL = 100;

const fromClassValue = (value: string): string => value.replaceAll("_", " ");

const toVariantDeclarations = (
  effects: readonly EffectItem[]
): EffectDeclaration[] =>
  toEffectDeclarations(effects).filter(
    (entry) =>
      entry.property === BOX_SHADOW ||
      entry.property === FILTER ||
      entry.property === BACKDROP
  );

const toBackdropTokens = (value: string, variant: string): string[] => {
  const blur = BLUR_RE.exec(value)?.groups?.["radius"] ?? null;
  const saturate = SATURATE_RE.exec(value)?.groups?.["amount"] ?? null;
  const tokens: string[] = [];

  if (blur !== null) {
    tokens.push(`${variant}backdrop-blur-[${blur}px]`);
  }

  if (saturate !== null && Number(saturate) !== SATURATE_FULL) {
    tokens.push(`${variant}backdrop-saturate-[${saturate}${PERCENT}]`);
  }

  return tokens;
};

const toFilterTokens = (value: string, variant: string): string[] => {
  const blur = BLUR_RE.exec(value)?.groups?.["radius"] ?? null;

  if (blur === null) {
    return [];
  }

  return [`${variant}blur-[${blur}px]`];
};

const toVariantTokens = (
  effects: readonly EffectItem[],
  variant: string,
  scale: ShadowScale
): string[] => {
  const scaled = toScaledEffects(effects, scale);
  const others = scaled.filter((item) => !isShadowItem(item));

  const rest = toVariantDeclarations(others).flatMap((entry) => {
    if (entry.property === FILTER) {
      return toFilterTokens(entry.value, variant);
    }

    if (entry.property === BACKDROP) {
      return toBackdropTokens(entry.value, variant);
    }

    return [];
  });

  return [...toShadowTokens(scaled, variant, scale), ...rest];
};

interface VariantStyle {
  readonly "box-shadow": string;
  readonly filter: string;
}

const toStyleValue = (
  values: ReadonlyMap<string, string>,
  property: string,
  kept: ReadonlySet<string>
): string | null => {
  const value = values.get(property) ?? null;

  if (value !== null) {
    return value;
  }

  if (kept.has(property)) {
    return NONE;
  }

  return null;
};

const toVariantStyle = (
  effects: readonly EffectItem[],
  kept: ReadonlySet<string>
): Partial<VariantStyle> => {
  const values = new Map(
    toVariantDeclarations(effects).map((entry) => [entry.property, entry.value])
  );

  const shadow = toStyleValue(values, BOX_SHADOW, kept);
  const filter = toStyleValue(values, FILTER, kept);
  const style: { -readonly [Key in keyof VariantStyle]?: string } = {};

  if (shadow !== null) {
    style[BOX_SHADOW] = shadow;
  }

  if (filter !== null) {
    style[FILTER] = filter;
  }

  return style;
};

const isEffectBase = (base: string, scale: ShadowScale): boolean => {
  if (
    SHADOW_BASES.some((name) => base === name || base.startsWith(`${name}-`))
  ) {
    return isShadowClass(base, scale);
  }

  return EFFECT_BASES.some(
    (name) => base === name || base.startsWith(`${name}-`)
  );
};

const fromVariantToken = (base: string): EffectDeclaration | null => {
  const match = ARBITRARY_RE.exec(base);
  const name = match?.groups?.["name"] ?? "";
  const value = fromClassValue(match?.groups?.["value"] ?? "");

  if (name === "shadow") {
    return { property: BOX_SHADOW, value };
  }

  if (name === "blur") {
    return { property: FILTER, value: `blur(${value})` };
  }

  if (name === "backdrop-blur") {
    return { property: BACKDROP, value: `blur(${value})` };
  }

  if (name === "backdrop-saturate") {
    return { property: BACKDROP, value: `saturate(${value})` };
  }

  return null;
};

const toShadowItems = (value: string, scale: ShadowScale): EffectItem[] =>
  toSplitTopLevel(value).flatMap((text) => {
    const item = fromShadowVar(text, scale) ?? toShadowItem(text);

    if (item === null) {
      return [];
    }

    return [item];
  });

const toFilterItems = (value: string): EffectItem[] => {
  const blur = BLUR_RE.exec(value)?.groups?.["radius"] ?? null;

  if (blur === null) {
    return [];
  }

  return [{ isEnabled: true, kind: "layer-blur", radius: Number(blur) }];
};

const toBackdropItems = (values: readonly string[]): EffectItem[] => {
  const text = values.join(" ");
  const blur = BLUR_RE.exec(text)?.groups?.["radius"] ?? null;
  const saturate = SATURATE_RE.exec(text)?.groups?.["amount"] ?? null;

  if (blur === null) {
    return [];
  }

  return [
    {
      isEnabled: true,
      kind: "background-blur",
      radius: Number(blur),
      saturation: Number(saturate ?? SATURATE_FULL),
    },
  ];
};

const fromVariantDeclarations = (
  declarations: readonly EffectDeclaration[],
  scale: ShadowScale
): EffectItem[] => {
  const shadows: EffectItem[] = [];
  const filters: EffectItem[] = [];
  const backdrops: string[] = [];

  for (const entry of declarations) {
    if (entry.property === BOX_SHADOW && entry.value !== NONE) {
      shadows.push(...toShadowItems(entry.value, scale));
    }

    if (entry.property === FILTER) {
      filters.push(...toFilterItems(entry.value));
    }

    if (entry.property === BACKDROP) {
      backdrops.push(entry.value);
    }
  }

  return [...shadows, ...filters, ...toBackdropItems(backdrops)];
};

export {
  fromVariantDeclarations,
  fromVariantToken,
  isEffectBase,
  toVariantStyle,
  toVariantTokens,
};

export type { VariantStyle };
