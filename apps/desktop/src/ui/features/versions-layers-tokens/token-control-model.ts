import type {
  CompiledTokenEntry,
  DirectStyleProperty,
} from "@design-studio/contracts";

import type { TokenFieldState } from "../../../shared/token-match.js";
import { COPY } from "./copy.js";

interface TokenCreateRequest {
  readonly prop: DirectStyleProperty;
  readonly targets: DirectStyleProperty[];
  readonly value: string;
}

const findEntry = (
  entries: CompiledTokenEntry[],
  cssVar: string | null
): CompiledTokenEntry | null =>
  entries.find((entry) => entry.cssVar === cssVar) ?? null;

const toStateTip = (state: TokenFieldState, name: string | null): string => {
  if (state.kind === "token") {
    return name ?? state.match.cssVar;
  }

  if (state.kind === "raw") {
    if (state.snap) {
      return `${COPY.tipRawNear}${state.snap.cssVar}`;
    }

    return COPY.tipRawNot;
  }

  return COPY.tipDesignTokens;
};

const toMiniLabel = (state: TokenFieldState, label: string): string => {
  if (state.kind === "token") {
    return `${label}${COPY.controlTokenMid}${state.match.cssVar}`;
  }

  if (state.kind === "raw") {
    return `${label}${COPY.controlRawSuffix}`;
  }

  return `${label}${COPY.controlChooseSuffix}`;
};

const toMiniTip = (state: TokenFieldState, current: string | null): string => {
  if (current) {
    return current;
  }

  if (state.kind === "raw") {
    return COPY.tipRawValue;
  }

  return COPY.tipChooseToken;
};

const toFieldLabel = (label: string, current: string | null): string => {
  if (current) {
    return `${label}${COPY.controlTokenMid}${current}`;
  }

  return `${COPY.controlChoosePrefix}${label.toLowerCase()}${COPY.controlTokenSuffix}`;
};

export { findEntry, toFieldLabel, toMiniLabel, toMiniTip, toStateTip };

export type { TokenCreateRequest };
