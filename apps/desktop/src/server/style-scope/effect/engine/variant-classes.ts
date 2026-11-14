import type { EffectItem } from "@design-studio/actions/effect/schema";
import { EFFECT_COLOR_PATTERN } from "@design-studio/contracts/layer-effect";

import { toEffectDeclarations } from "./compile.js";
import type { EffectDeclaration } from "./compile.js";

type ShadowKind = "drop-shadow" | "inner-shadow";

const BOX_SHADOW = "box-shadow";

const FILTER = "filter";

const BACKDROP = "backdrop-filter";

const NONE = "none";

const LENGTH_COUNT = 4;

const PERCENT = "%";

const LENGTH_RE = /^-?[\d.]+(?:px)?$/u;

const BLUR_RE = /blur\((?<radius>-?[\d.]+)px\)/u;

const SATURATE_RE = /saturate\((?<amount>[\d.]+)%?\)/u;

const ARBITRARY_RE = /^(?<name>[a-z-]+)-\[(?<value>[^\]]+)\]$/u;

const EFFECT_BASES: readonly string[] = [
  "shadow",
  "inset-shadow",
  "blur",
  "backdrop-blur",
  "backdrop-saturate",
  "drop-shadow",
];

const SATURATE_FULL = 100;

const toClassValue = (value: string): string =>
  value.trim().replaceAll(/\s+/gu, "_");

const fromClassValue = (value: string): string => value.replaceAll("_", " ");

const toSplitTopLevel = (text: string): string[] => {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];

    if (char === "(") {
      depth += 1;
    }

    if (char === ")") {
      depth -= 1;
    }

    if (char === "," && depth === 0) {
      parts.push(text.slice(start, index));
      start = index + 1;
    }
  }

  parts.push(text.slice(start));

  return parts.flatMap((part) => {
    const trimmed = part.trim();

    if (trimmed === "") {
      return [];
    }

    return [trimmed];
  });
};

const toSplitWords = (text: string): string[] => {
  const words: string[] = [];
  let depth = 0;
  let word = "";

  for (const char of text) {
    if (char === "(") {
      depth += 1;
    }

    if (char === ")") {
      depth -= 1;
    }

    if (/\s/u.test(char) && depth === 0) {
      words.push(word);
      word = "";
    } else {
      word += char;
    }
  }

  words.push(word);

  return words.filter((entry) => entry !== "");
};

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
  variant: string
): string[] =>
  toVariantDeclarations(effects).flatMap((entry) => {
    if (entry.property === BOX_SHADOW) {
      return [`${variant}shadow-[${toClassValue(entry.value)}]`];
    }

    if (entry.property === FILTER) {
      return toFilterTokens(entry.value, variant);
    }

    return toBackdropTokens(entry.value, variant);
  });

interface VariantStyle {
  readonly "box-shadow": string;
  readonly filter: string;
}

const toVariantStyle = (effects: readonly EffectItem[]): VariantStyle => {
  const declarations = toVariantDeclarations(effects);

  const toValue = (property: string): string =>
    declarations.find((entry) => entry.property === property)?.value ?? NONE;

  return { [BOX_SHADOW]: toValue(BOX_SHADOW), [FILTER]: toValue(FILTER) };
};

const isEffectBase = (base: string): boolean =>
  EFFECT_BASES.some((name) => base === name || base.startsWith(`${name}-`));

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

const toShadowItem = (text: string): EffectItem | null => {
  const words = toSplitWords(text);
  let shadowKind: ShadowKind = "drop-shadow";

  if (words[0] === "inset") {
    shadowKind = "inner-shadow";
    words.shift();
  }

  const lengths: number[] = [];
  const colors: string[] = [];

  for (const word of words) {
    if (LENGTH_RE.test(word)) {
      lengths.push(Number(word.replace("px", "")));
    } else {
      colors.push(word);
    }
  }

  if (lengths.length < 2 || !EFFECT_COLOR_PATTERN.test(colors.join(" "))) {
    return null;
  }

  const [x = 0, y = 0, radius = 0, size = 0] = lengths.slice(0, LENGTH_COUNT);

  return {
    blur: radius,
    color: colors.join(" "),
    isEnabled: true,
    kind: shadowKind,
    offsetX: x,
    offsetY: y,
    spread: size,
  };
};

const toShadowItems = (value: string): EffectItem[] =>
  toSplitTopLevel(value).flatMap((text) => {
    const item = toShadowItem(text);

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
  declarations: readonly EffectDeclaration[]
): EffectItem[] => {
  const shadows: EffectItem[] = [];
  const filters: EffectItem[] = [];
  const backdrops: string[] = [];

  for (const entry of declarations) {
    if (entry.property === BOX_SHADOW && entry.value !== NONE) {
      shadows.push(...toShadowItems(entry.value));
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
