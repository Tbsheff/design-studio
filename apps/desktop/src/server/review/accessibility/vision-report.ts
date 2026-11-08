import { formatHex, parse } from "culori";

import { contrastPairsOf } from "./contrast.js";
import type { CompiledTokenEntry, ContrastPair } from "./deps.js";
import type { VisionKind } from "./engine/vision-matrix.js";
import { toConfusedPairs, toLostPairs } from "./engine/vision-pairs.js";
import type {
  VisionConfused,
  VisionLostPair,
  VisionPairInput,
  VisionSample,
  VisionToken,
} from "./engine/vision-pairs.js";
import type { VisionCapture } from "./vision-page.js";

interface VisionCell {
  readonly kind: VisionKind;
  readonly lostPairs: readonly VisionLostPair[];
  readonly shotPath: string;
}

interface VisionReport {
  readonly cells: readonly VisionCell[];
  readonly confusedPairs: readonly VisionConfused[];
  readonly frameId: string;
  readonly sheetPath: string;
}

const toHexColor = (value: string): string | null => {
  const color = parse(value);

  if (!color) {
    return null;
  }

  return formatHex(color) ?? null;
};

const toLayerId = (pair: ContrastPair): string => {
  if (pair.source === null) {
    return pair.selector;
  }

  return `${pair.source.file}:${pair.source.line}:${pair.source.col}`;
};

const toPairInput = (pair: ContrastPair): VisionPairInput => ({
  background: pair.background,
  foreground: pair.foreground,
  isLarge: pair.large,
  isPassing: pair.passes,
  layerId: toLayerId(pair),
  need: pair.need,
  ratio: pair.ratio,
  text: pair.text,
});

const toVisionTokens = (
  entries: readonly CompiledTokenEntry[]
): VisionToken[] => {
  const tokens: VisionToken[] = [];

  for (const entry of entries) {
    const hex = toHexColor(entry.value);

    if (entry.type === "color" && hex !== null) {
      tokens.push({ cssVar: entry.cssVar, hex });
    }
  }

  return tokens;
};

const toSamples = (capture: VisionCapture): VisionSample[] => {
  const samples: VisionSample[] = [];

  for (const raw of capture.colors.colors) {
    const color = toHexColor(raw.color);

    if (color !== null) {
      samples.push({
        color,
        label: raw.label,
        layerId: raw.loc ?? raw.selector,
      });
    }
  }

  return samples;
};

const toVisionCells = (
  kinds: readonly VisionKind[],
  files: ReadonlyMap<VisionKind, string>,
  capture: VisionCapture,
  target: {
    readonly entries: readonly CompiledTokenEntry[];
    readonly frameId: string;
  }
): VisionCell[] => {
  const pairs = contrastPairsOf(
    target.frameId,
    capture.raw.texts,
    target.entries
  );

  const inputs = pairs.map((pair) => toPairInput(pair));
  const tokens = toVisionTokens(target.entries);

  return kinds.map((kind) => ({
    kind,
    lostPairs: toLostPairs(kind, inputs, tokens),
    shotPath: files.get(kind) ?? "",
  }));
};

const toVisionConfused = (
  kinds: readonly VisionKind[],
  capture: VisionCapture
): VisionConfused[] => {
  const samples = toSamples(capture);

  return kinds.flatMap((kind) => toConfusedPairs(kind, samples));
};

export { toVisionCells, toVisionConfused };

export type { VisionCell, VisionReport };
