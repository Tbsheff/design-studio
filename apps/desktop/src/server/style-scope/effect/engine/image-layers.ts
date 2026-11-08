import type { EffectItem } from "@design-studio/actions/effect/schema";

import { toAlphaHex, toRounded, toSeededRandom } from "./numbers.js";
import { toTag } from "./tags.js";

type NoiseItem = Extract<EffectItem, { readonly kind: "noise" }>;

type ShaderItem = Extract<EffectItem, { readonly kind: "shader" }>;

interface ImageLayer {
  readonly image: string;
  readonly size: string;
}

const NOISE_TILE = 200;

const GRAIN_FREQUENCY = 1.2;

const GRAIN_SCALE = 0.35;

const DITHER_TILE = 4;

const DITHER_SCALE = 0.35;

const MESH_FADE = 55;

const PERCENT = 100;

const AUTO = "auto";

const NO_COLOR = "#000000";

const toDataImage = (svg: string): string =>
  `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;

const toNoiseSvg = (
  frequency: number,
  opacity: number,
  isMonochrome: boolean
): string => {
  const turbulence = toTag(
    "feTurbulence",
    `type='fractalNoise' baseFrequency='${toRounded(frequency)}' numOctaves='3' stitchTiles='stitch'`,
    null
  );

  let matrix = "";

  if (isMonochrome) {
    matrix = toTag("feColorMatrix", "type='saturate' values='0'", null);
  }

  const filter = toTag(
    "filter",
    "id='n' x='0' y='0' width='100%' height='100%'",
    turbulence + matrix
  );

  const rect = toTag(
    "rect",
    `width='100%' height='100%' filter='url(#n)' opacity='${toRounded(opacity)}'`,
    null
  );

  return toTag(
    "svg",
    `xmlns='http://www.w3.org/2000/svg' width='${NOISE_TILE}' height='${NOISE_TILE}'`,
    filter + rect
  );
};

const toNoiseLayer = (item: NoiseItem): ImageLayer => ({
  image: toDataImage(
    toNoiseSvg(item.frequency, item.opacity, item.isMonochrome)
  ),
  size: `${NOISE_TILE}px ${NOISE_TILE}px`,
});

const toColorAt = (item: ShaderItem, index: number): string =>
  item.colors[index % item.colors.length] ?? NO_COLOR;

const toBaseLayer = (item: ShaderItem): ImageLayer => ({
  image: `linear-gradient(135deg, ${toColorAt(item, 0)}, ${toColorAt(item, item.colors.length - 1)})`,
  size: AUTO,
});

const toMeshLayers = (item: ShaderItem): ImageLayer[] => {
  const random = toSeededRandom(item.seed);
  const alpha = toAlphaHex(item.intensity);

  const spots = item.colors.map((color): ImageLayer => {
    const left = Math.round(random() * PERCENT);
    const top = Math.round(random() * PERCENT);

    return {
      image: `radial-gradient(at ${left}% ${top}%, ${color}${alpha} 0px, transparent ${MESH_FADE}%)`,
      size: AUTO,
    };
  });

  return [...spots, toBaseLayer(item)];
};

const toAuroraLayers = (item: ShaderItem): ImageLayer[] => {
  const alpha = toAlphaHex(item.intensity);
  const first = toColorAt(item, 0);
  const second = toColorAt(item, 1);
  const third = toColorAt(item, 2);

  return [
    {
      image: `linear-gradient(110deg, transparent 15%, ${first}${alpha} 35%, ${second}${alpha} 55%, ${third}${alpha} 70%, transparent 90%)`,
      size: AUTO,
    },
    {
      image: `radial-gradient(ellipse at 50% 120%, ${second}${alpha} 0px, transparent 60%)`,
      size: AUTO,
    },
    {
      image: `radial-gradient(ellipse at 20% -10%, ${first}${alpha} 0px, transparent 50%)`,
      size: AUTO,
    },
    { image: "linear-gradient(180deg, #0b1020, #111936)", size: AUTO },
  ];
};

const toGrainLayers = (item: ShaderItem): ImageLayer[] => [
  toNoiseLayer({
    frequency: GRAIN_FREQUENCY,
    isEnabled: true,
    isMonochrome: true,
    kind: "noise",
    opacity: item.intensity * GRAIN_SCALE,
  }),
  toBaseLayer(item),
];

const toDitherLayers = (item: ShaderItem): ImageLayer[] => [
  {
    image: `radial-gradient(rgba(0, 0, 0, ${toRounded(item.intensity * DITHER_SCALE)}) 1px, transparent 1.2px)`,
    size: `${DITHER_TILE}px ${DITHER_TILE}px`,
  },
  toBaseLayer(item),
];

const toShaderLayers = (item: ShaderItem): ImageLayer[] => {
  if (item.preset === "mesh") {
    return toMeshLayers(item);
  }

  if (item.preset === "aurora") {
    return toAuroraLayers(item);
  }

  if (item.preset === "grain") {
    return toGrainLayers(item);
  }

  return toDitherLayers(item);
};

export { AUTO, toNoiseLayer, toShaderLayers };

export type { ImageLayer, NoiseItem, ShaderItem };
