import {
  DELTA_E_CONFUSED,
  fromHex,
  toChroma,
  toContrastRatio,
  toDeltaE,
  toHex,
  toSeenColor,
  toSeenPair,
} from "./vision-matrix.js";
import type { Rgb, VisionKind } from "./vision-matrix.js";

interface VisionPairInput {
  readonly background: string;
  readonly foreground: string;
  readonly isLarge: boolean;
  readonly isPassing: boolean;
  readonly layerId: string;
  readonly need: number;
  readonly ratio: number;
  readonly text: string;
}

interface VisionToken {
  readonly cssVar: string;
  readonly hex: string;
}

interface VisionPassingToken {
  readonly cssVar: string;
  readonly hex: string;
  readonly ratio: number;
}

interface VisionLostPair {
  readonly after: number;
  readonly afterForeground: string;
  readonly background: string;
  readonly before: number;
  readonly foreground: string;
  readonly layerId: string;
  readonly nearestToken: VisionPassingToken | null;
  readonly need: number;
  readonly text: string;
}

interface VisionSample {
  readonly color: string;
  readonly label: string;
  readonly layerId: string;
}

interface VisionConfused {
  readonly after: number;
  readonly before: number;
  readonly first: VisionSample;
  readonly kind: VisionKind;
  readonly second: VisionSample;
}

interface TokenRequest {
  readonly background: Rgb;
  readonly foreground: Rgb;
  readonly isLarge: boolean;
  readonly need: number;
  readonly vision: VisionKind;
}

interface TokenCandidate {
  readonly distance: number;
  readonly token: VisionPassingToken;
}

const CHROMA_MIN = 20;

const CONFUSED_MAX = 20;

const toTokenCandidate = (
  token: VisionToken,
  request: TokenRequest
): TokenCandidate | null => {
  const rgb = fromHex(token.hex);

  if (rgb === null) {
    return null;
  }

  const seen = toSeenPair(
    request.vision,
    { background: request.background, foreground: rgb },
    request.isLarge
  );

  const after = toContrastRatio(seen.foreground, seen.background);
  const before = toContrastRatio(rgb, request.background);

  if (after < request.need || before < request.need) {
    return null;
  }

  return {
    distance: toDeltaE(rgb, request.foreground),
    token: { cssVar: token.cssVar, hex: token.hex, ratio: after },
  };
};

const toNearestToken = (
  tokens: readonly VisionToken[],
  request: TokenRequest
): VisionPassingToken | null => {
  let best: TokenCandidate | null = null;

  for (const token of tokens) {
    const candidate = toTokenCandidate(token, request);

    if (
      candidate !== null &&
      (best === null || candidate.distance < best.distance)
    ) {
      best = candidate;
    }
  }

  return best?.token ?? null;
};

const toLostPair = (
  kind: VisionKind,
  pair: VisionPairInput,
  tokens: readonly VisionToken[]
): VisionLostPair | null => {
  const front = fromHex(pair.foreground);
  const back = fromHex(pair.background);

  if (!pair.isPassing || front === null || back === null) {
    return null;
  }

  const seen = toSeenPair(
    kind,
    { background: back, foreground: front },
    pair.isLarge
  );

  const after = toContrastRatio(seen.foreground, seen.background);

  if (after >= pair.need) {
    return null;
  }

  return {
    after,
    afterForeground: toHex(seen.foreground),
    background: pair.background,
    before: pair.ratio,
    foreground: pair.foreground,
    layerId: pair.layerId,
    nearestToken: toNearestToken(tokens, {
      background: back,
      foreground: front,
      isLarge: pair.isLarge,
      need: pair.need,
      vision: kind,
    }),
    need: pair.need,
    text: pair.text,
  };
};

const toLostPairs = (
  kind: VisionKind,
  pairs: readonly VisionPairInput[],
  tokens: readonly VisionToken[]
): VisionLostPair[] => {
  const lost: VisionLostPair[] = [];

  for (const pair of pairs) {
    const found = toLostPair(kind, pair, tokens);

    if (found !== null) {
      lost.push(found);
    }
  }

  return lost.toSorted((first, second) => first.after - second.after);
};

const toUniqueSamples = (samples: readonly VisionSample[]): VisionSample[] => {
  const seen = new Set<string>();
  const unique: VisionSample[] = [];

  for (const sample of samples) {
    const rgb = fromHex(sample.color);

    if (
      rgb !== null &&
      !seen.has(sample.color) &&
      toChroma(rgb) >= CHROMA_MIN
    ) {
      seen.add(sample.color);
      unique.push(sample);
    }
  }

  return unique;
};

const toConfused = (
  kind: VisionKind,
  first: VisionSample,
  second: VisionSample
): VisionConfused | null => {
  const left = fromHex(first.color);
  const right = fromHex(second.color);

  if (left === null || right === null) {
    return null;
  }

  const before = toDeltaE(left, right);
  const after = toDeltaE(toSeenColor(kind, left), toSeenColor(kind, right));

  if (before < DELTA_E_CONFUSED || after >= DELTA_E_CONFUSED) {
    return null;
  }

  return { after, before, first, kind, second };
};

const toConfusedPairs = (
  kind: VisionKind,
  samples: readonly VisionSample[]
): VisionConfused[] => {
  const unique = toUniqueSamples(samples);
  const found: VisionConfused[] = [];

  for (const [at, first] of unique.entries()) {
    for (const second of unique.slice(at + 1)) {
      const confused = toConfused(kind, first, second);

      if (confused !== null) {
        found.push(confused);
      }
    }
  }

  return found
    .toSorted((left, right) => left.after - right.after)
    .slice(0, CONFUSED_MAX);
};

export { toConfusedPairs, toLostPairs };

export type {
  VisionConfused,
  VisionLostPair,
  VisionPairInput,
  VisionPassingToken,
  VisionSample,
  VisionToken,
};
