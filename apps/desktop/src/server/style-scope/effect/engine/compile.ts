import type { EffectItem } from "@design-studio/actions/effect/schema";

import { AUTO, toNoiseLayer, toShaderLayers } from "./image-layers.js";
import type { ImageLayer, ShaderItem } from "./image-layers.js";
import { HEX_RADIX, toPx, toRounded } from "./numbers.js";

interface EffectDeclaration {
  readonly property: string;
  readonly value: string;
}

interface Parts {
  readonly backdrops: string[];
  readonly filters: string[];
  readonly layers: ImageLayer[];
  readonly shadows: string[];
  shader: ShaderItem | null;
  tint: string | null;
}

type ShadowItem = Extract<
  EffectItem,
  { readonly kind: "drop-shadow" | "inner-shadow" }
>;

type GlassItem = Extract<EffectItem, { readonly kind: "glass" }>;

const PERCENT = 100;

const HEX_SHORT = 3;

const HEX_LONG = 6;

const HEX_PAIR = 2;

const GLASS_DEPTH = "0 8px 32px rgba(0, 0, 0, 0.12)";

const EDGE_SHARE = 2;

const toHexParts = (color: string): readonly number[] | null => {
  const match = /^#(?<digits>[0-9a-fA-F]+)$/u.exec(color.trim());
  let digits = match?.groups?.["digits"] ?? "";

  if (digits.length === HEX_SHORT) {
    digits = [...digits].map((digit) => digit + digit).join("");
  }

  if (digits.length !== HEX_LONG) {
    return null;
  }

  return [0, HEX_PAIR, HEX_PAIR * 2].map((start) =>
    Number.parseInt(digits.slice(start, start + HEX_PAIR), HEX_RADIX)
  );
};

const toGlassTint = (glass: GlassItem): string => {
  const parts = toHexParts(glass.tint);

  if (parts !== null) {
    return `rgba(${parts.join(", ")}, ${toRounded(glass.tintOpacity)})`;
  }

  return `color-mix(in srgb, ${glass.tint} ${Math.round(glass.tintOpacity * PERCENT)}%, transparent)`;
};

const toShadowText = (item: ShadowItem): string => {
  let inset = "";

  if (item.kind === "inner-shadow") {
    inset = "inset ";
  }

  if (item.size !== null) {
    return `var(--${inset.replace(" ", "-")}shadow-${item.size})`;
  }

  return `${inset}${toPx(item.offsetX)} ${toPx(item.offsetY)} ${toPx(item.blur)} ${toPx(item.spread)} ${item.color}`;
};

const toBackdropText = (radius: number, saturation: number): string =>
  `blur(${toPx(radius)}) saturate(${toRounded(saturation)}%)`;

const applyGlass = (parts: Parts, glass: GlassItem): void => {
  parts.backdrops.push(toBackdropText(glass.blur, glass.saturation));
  parts.tint = toGlassTint(glass);
  const edge = toRounded(glass.edge);
  const soft = toRounded(glass.edge / EDGE_SHARE);
  parts.shadows.push(
    `inset 0 1px 0 rgba(255, 255, 255, ${edge})`,
    `inset 0 0 0 1px rgba(255, 255, 255, ${soft})`,
    GLASS_DEPTH
  );
};

const applyPart = (parts: Parts, item: EffectItem): void => {
  if (!item.isEnabled) {
    return;
  }

  switch (item.kind) {
    case "drop-shadow":
    case "inner-shadow": {
      parts.shadows.push(toShadowText(item));

      break;
    }

    case "layer-blur": {
      parts.filters.push(`blur(${toPx(item.radius)})`);

      break;
    }

    case "background-blur": {
      parts.backdrops.push(toBackdropText(item.radius, item.saturation));

      break;
    }

    case "noise": {
      parts.layers.push(toNoiseLayer(item));

      break;
    }

    case "glass": {
      applyGlass(parts, item);

      break;
    }

    case "shader": {
      if (parts.shader === null) {
        parts.shader = item;
        parts.layers.push(...toShaderLayers(item));
      }

      break;
    }

    default: {
      break;
    }
  }
};

const toShaderDeclarations = (
  shader: ShaderItem | null
): EffectDeclaration[] => {
  if (shader === null) {
    return [];
  }

  return [
    { property: "--fx-preset", value: shader.preset },
    { property: "--fx-colors", value: shader.colors.join(",") },
    { property: "--fx-seed", value: String(shader.seed) },
    { property: "--fx-speed", value: String(toRounded(shader.speed)) },
    { property: "--fx-intensity", value: String(toRounded(shader.intensity)) },
  ];
};

const toBackgroundDeclarations = (parts: Parts): EffectDeclaration[] => {
  const result: EffectDeclaration[] = [];

  if (parts.tint !== null) {
    result.push({ property: "background-color", value: parts.tint });
  }

  if (parts.layers.length > 0) {
    result.push({
      property: "background-image",
      value: parts.layers.map((layer) => layer.image).join(", "),
    });

    if (parts.layers.some((layer) => layer.size !== AUTO)) {
      result.push({
        property: "background-size",
        value: parts.layers.map((layer) => layer.size).join(", "),
      });
    }
  }

  return result;
};

const toListDeclaration = (
  property: string,
  values: readonly string[],
  separator: string
): EffectDeclaration[] => {
  if (values.length === 0) {
    return [];
  }

  return [{ property, value: values.join(separator) }];
};

const toEffectDeclarations = (
  effects: readonly EffectItem[]
): EffectDeclaration[] => {
  const parts: Parts = {
    backdrops: [],
    filters: [],
    layers: [],
    shader: null,
    shadows: [],
    tint: null,
  };

  for (const item of effects) {
    applyPart(parts, item);
  }

  const backdrop = toListDeclaration("backdrop-filter", parts.backdrops, " ");

  return [
    ...backdrop,
    ...backdrop.map((entry) => ({
      property: "-webkit-backdrop-filter",
      value: entry.value,
    })),
    ...toBackgroundDeclarations(parts),
    ...toListDeclaration("box-shadow", parts.shadows, ", "),
    ...toListDeclaration("filter", parts.filters, " "),
    ...toShaderDeclarations(parts.shader),
  ];
};

const hasShader = (effects: readonly EffectItem[]): boolean =>
  effects.some((item) => item.kind === "shader" && item.isEnabled);

export { hasShader, toEffectDeclarations, toShadowText };

export type { EffectDeclaration };
