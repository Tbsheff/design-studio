import type { EffectItem } from "@design-studio/actions/effect/schema";

import { toShadowText } from "./compile.js";
import type { ShadowItem } from "./shadow-parse.js";
import { isShadowItem, toSizedValue } from "./shadow-scale.js";
import type { ShadowScale } from "./shadow-scale.js";

interface ShadowSplit {
  readonly named: string[];
  readonly rest: readonly ShadowItem[];
}

const toClassValue = (value: string): string =>
  value.trim().replaceAll(/\s+/gu, "_");

const toLiteralText = (scale: ShadowScale, item: ShadowItem): string =>
  toSizedValue(scale, item) ?? toShadowText({ ...item, size: null });

const toShadowSplit = (shadows: readonly ShadowItem[]): ShadowSplit => {
  const named: string[] = [];

  const insets = shadows.filter(
    (item) => item.kind === "inner-shadow" && item.size !== null
  );

  const drops = shadows.filter(
    (item) => item.kind === "drop-shadow" && item.size !== null
  );

  const inset = insets.at(0) ?? null;
  let rest = shadows;

  if (insets.length === 1 && inset !== null) {
    named.push(`inset-shadow-${inset.size}`);
    rest = rest.filter((item) => item !== inset);
  }

  const drop = drops.at(0) ?? null;

  if (rest.length === 1 && drop !== null && rest.at(0) === drop) {
    named.push(`shadow-${drop.size}`);
    rest = [];
  }

  return { named, rest };
};

const toShadowTokens = (
  effects: readonly EffectItem[],
  variant: string,
  scale: ShadowScale
): string[] => {
  const shadows = effects.filter(
    (item): item is ShadowItem => isShadowItem(item) && item.isEnabled
  );

  const split = toShadowSplit(shadows);
  const tokens = split.named.map((name) => `${variant}${name}`);

  if (split.rest.length > 0) {
    const value = split.rest
      .map((item) => toLiteralText(scale, item))
      .join(", ");

    tokens.push(`${variant}shadow-[${toClassValue(value)}]`);
  }

  return tokens;
};

export { toShadowTokens };
