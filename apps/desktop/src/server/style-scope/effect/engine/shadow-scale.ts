import type { EffectItem } from "@design-studio/actions/effect/schema";
import { SHADOW_SIZES } from "@design-studio/contracts/layer-effect";
import type { ShadowSize } from "@design-studio/contracts/layer-effect";

import { toRounded } from "./numbers.js";
import { toShadowItem, toSplitTopLevel } from "./shadow-parse.js";
import type { ShadowItem } from "./shadow-parse.js";

interface ShadowScale {
  readonly drop: ReadonlyMap<ShadowSize, string>;
  readonly inner: ReadonlyMap<ShadowSize, string>;
  readonly names: ReadonlySet<string>;
}

interface ShadowScaleSource {
  readonly hasInsetScale: boolean;
  readonly themeShadow: ReadonlyMap<string, string> | null;
  readonly tokenText: string;
}

interface TokenScale {
  readonly drop: Map<ShadowSize, string>;
  readonly inner: Map<ShadowSize, string>;
}

const INSET_DEFAULTS: readonly (readonly [ShadowSize, string])[] = [
  ["2xs", "inset 0 1px rgb(0 0 0 / 0.05)"],
  ["xs", "inset 0 1px 1px rgb(0 0 0 / 0.05)"],
  ["sm", "inset 0 2px 4px rgb(0 0 0 / 0.05)"],
];

const TOKEN_RE =
  /--(?<inset>inset-)?shadow-(?<size>2xs|xs|sm|md|lg|xl|2xl)\s*:\s*(?<value>[^;{}]+)/gu;

const SIZE_CLASS_RE =
  /^(?<inset>inset-)?shadow-(?<size>2xs|xs|sm|md|lg|xl|2xl)$/u;

const VAR_RE = /^var\(--(?<inset>inset-)?shadow-(?<size>[a-z0-9]+)\)$/u;

const ARBITRARY_RE = /^(?:inset-)?shadow-\[(?<value>[^\]]+)\]$/u;

const PLAIN_CLASSES: ReadonlySet<string> = new Set([
  "shadow",
  "shadow-none",
  "inset-shadow-none",
]);

const DROP: ShadowItem["kind"] = "drop-shadow";

const INNER: ShadowItem["kind"] = "inner-shadow";

const SHADOW_KINDS: ReadonlySet<EffectItem["kind"]> = new Set([DROP, INNER]);

const COLOR_MARKS: readonly string[] = [",", "/", "(", ")"];

const FALLBACK_COLOR = "rgb(0 0 0 / 0.1)";

const EMPTY_SCALE: ShadowScale = {
  drop: new Map(),
  inner: new Map(),
  names: new Set(),
};

const isShadowSize = (text: string): text is ShadowSize =>
  SHADOW_SIZES.some((size) => size === text);

const isShadowItem = (item: EffectItem): item is ShadowItem =>
  SHADOW_KINDS.has(item.kind);

const toTargetMap = (
  scale: TokenScale,
  inset: string
): Map<ShadowSize, string> => {
  if (inset === "") {
    return scale.drop;
  }

  return scale.inner;
};

const toMatchKind = (inset: string): ShadowItem["kind"] => {
  if (inset === "") {
    return DROP;
  }

  return INNER;
};

const fromTokenText = (text: string): TokenScale => {
  const drop = new Map<ShadowSize, string>();
  const inner = new Map<ShadowSize, string>();

  for (const match of text.matchAll(TOKEN_RE)) {
    const size = match.groups?.["size"] ?? "";
    const value = (match.groups?.["value"] ?? "").trim();

    if (isShadowSize(size) && value !== "") {
      toTargetMap({ drop, inner }, match.groups?.["inset"] ?? "").set(
        size,
        value
      );
    }
  }

  return { drop, inner };
};

const toSizedMap = (
  entries: Iterable<readonly [string, string]>
): Map<ShadowSize, string> => {
  const map = new Map<ShadowSize, string>();

  for (const [name, value] of entries) {
    if (isShadowSize(name)) {
      map.set(name, value);
    }
  }

  return map;
};

const toShadowScale = (source: ShadowScaleSource): ShadowScale => {
  const tokens = fromTokenText(source.tokenText);

  if (source.themeShadow === null) {
    return { drop: tokens.drop, inner: tokens.inner, names: new Set() };
  }

  const drop = toSizedMap(source.themeShadow.entries());
  const inner = new Map<ShadowSize, string>();

  if (source.hasInsetScale) {
    for (const [size, value] of [...INSET_DEFAULTS, ...tokens.inner]) {
      inner.set(size, value);
    }
  }

  return { drop, inner, names: new Set(source.themeShadow.keys()) };
};

const toKindScale = (
  scale: ShadowScale,
  kind: ShadowItem["kind"]
): ReadonlyMap<ShadowSize, string> => {
  if (kind === INNER) {
    return scale.inner;
  }

  return scale.drop;
};

const toSizes = (
  scale: ShadowScale,
  kind: ShadowItem["kind"]
): ShadowSize[] => {
  const map = toKindScale(scale, kind);

  return SHADOW_SIZES.filter((size) => map.has(size));
};

const toFirstLayer = (value: string): ShadowItem | null => {
  const [first = ""] = toSplitTopLevel(value);

  return toShadowItem(first);
};

const toSizedItem = (
  scale: ShadowScale,
  base: Pick<ShadowItem, "isEnabled" | "kind">,
  picked: ShadowSize
): ShadowItem => {
  const value = toKindScale(scale, base.kind).get(picked) ?? "";
  const layer = toFirstLayer(value);

  return {
    blur: layer?.blur ?? 0,
    color: layer?.color ?? FALLBACK_COLOR,
    isEnabled: base.isEnabled,
    kind: base.kind,
    offsetX: layer?.offsetX ?? 0,
    offsetY: layer?.offsetY ?? 0,
    size: picked,
    spread: layer?.spread ?? 0,
  };
};

const toColorKey = (color: string): string => {
  let text = color.toLowerCase().trim().split(/\s+/u).join(" ");

  for (const mark of COLOR_MARKS) {
    text = text.replaceAll(` ${mark}`, mark).replaceAll(`${mark} `, mark);
  }

  return text;
};

const toItemKey = (item: ShadowItem): string =>
  [
    item.kind,
    toRounded(item.offsetX),
    toRounded(item.offsetY),
    toRounded(item.blur),
    toRounded(item.spread),
    toColorKey(item.color),
  ].join(" ");

const toMatchedSize = (
  scale: ShadowScale,
  item: ShadowItem
): ShadowSize | null => {
  const key = toItemKey(item);

  for (const size of toSizes(scale, item.kind)) {
    const layer = toFirstLayer(toKindScale(scale, item.kind).get(size) ?? "");

    if (layer !== null && toItemKey({ ...layer, kind: item.kind }) === key) {
      return size;
    }
  }

  return null;
};

const toScaledItem = (scale: ShadowScale, item: ShadowItem): ShadowItem => {
  const map = toKindScale(scale, item.kind);

  if (item.size !== null && map.has(item.size)) {
    return toSizedItem(scale, item, item.size);
  }

  const matched = toMatchedSize(scale, item);

  if (matched === null) {
    return { ...item, size: null };
  }

  return toSizedItem(scale, item, matched);
};

const toScaledEffects = (
  effects: readonly EffectItem[],
  scale: ShadowScale
): EffectItem[] =>
  effects.map((item) => {
    if (isShadowItem(item)) {
      return toScaledItem(scale, item);
    }

    return item;
  });

const toSizedValue = (scale: ShadowScale, item: ShadowItem): string | null => {
  if (item.size === null) {
    return null;
  }

  return toKindScale(scale, item.kind).get(item.size) ?? null;
};

const fromShadowClass = (
  base: string,
  scale: ShadowScale
): ShadowItem | null => {
  const match = SIZE_CLASS_RE.exec(base);
  const size = match?.groups?.["size"] ?? "";
  const kind = toMatchKind(match?.groups?.["inset"] ?? "");

  if (!isShadowSize(size) || !toKindScale(scale, kind).has(size)) {
    return null;
  }

  return toSizedItem(scale, { isEnabled: true, kind }, size);
};

const fromShadowVar = (text: string, scale: ShadowScale): ShadowItem | null => {
  const match = VAR_RE.exec(text.trim());
  const size = match?.groups?.["size"] ?? "";
  const kind = toMatchKind(match?.groups?.["inset"] ?? "");

  if (!isShadowSize(size)) {
    return null;
  }

  return toSizedItem(scale, { isEnabled: true, kind }, size);
};

const isArbitraryShadow = (value: string): boolean =>
  !value.startsWith("color:") &&
  (value.includes("_") || value.startsWith("var(--"));

const isShadowClass = (base: string, scale: ShadowScale): boolean => {
  if (PLAIN_CLASSES.has(base) || SIZE_CLASS_RE.test(base)) {
    return true;
  }

  if (
    base.startsWith("shadow-") &&
    scale.names.has(base.slice("shadow-".length))
  ) {
    return true;
  }

  const arbitrary = ARBITRARY_RE.exec(base)?.groups?.["value"] ?? null;

  return arbitrary !== null && isArbitraryShadow(arbitrary);
};

export {
  EMPTY_SCALE,
  fromShadowClass,
  fromShadowVar,
  isShadowClass,
  isShadowItem,
  toScaledEffects,
  toShadowScale,
  toSizedValue,
  toSizes,
};

export type { ShadowScale, ShadowScaleSource };
