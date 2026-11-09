import type { CompiledTokenEntry } from "@design-studio/contracts";

import { matchColor } from "../../../shared/token-match.js";
import type { TokenMode } from "../../../shared/token-match.js";

interface NearToken {
  readonly cssVar: string;
  readonly deltaE: number;
  readonly name: string;
  readonly value: string;
}

const NEAR_COUNT = 3;
const DELTA_SCALE = 100;
const DELTA_DIGITS = 1;

const toNearestTokens = (
  hex: string,
  entries: readonly CompiledTokenEntry[],
  mode: TokenMode
): readonly NearToken[] =>
  matchColor(hex, [...entries], mode)
    .slice(0, NEAR_COUNT)
    .map((match) => ({
      cssVar: match.cssVar,
      deltaE: match.distance * DELTA_SCALE,
      name: match.path.replace(/^color\./u, ""),
      value: match.value,
    }));

const toDeltaLabel = (deltaE: number): string =>
  `ΔE ${deltaE.toFixed(DELTA_DIGITS)}`;

const toTokenValue = (cssVar: string): string => `var(${cssVar})`;

export { toDeltaLabel, toNearestTokens, toTokenValue };

export type { NearToken };
