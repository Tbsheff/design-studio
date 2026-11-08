import type {
  CompiledTokenEntry,
  DirectStyleProperty,
} from "@design-studio/contracts";

import {
  tokenFieldState,
  tokensForProperty,
} from "../../../shared/token-match.js";
import type {
  TokenFieldState,
  TokenMode,
} from "../../../shared/token-match.js";
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

interface StateRefs {
  readonly current: string | null;
  readonly nearest: string | null;
}

const toStateRefs = (state: TokenFieldState): StateRefs => {
  if (state.kind === "token") {
    return { current: state.match.cssVar, nearest: null };
  }

  if (state.kind === "raw") {
    return { current: null, nearest: state.nearest?.cssVar ?? null };
  }

  return { current: null, nearest: null };
};

interface FieldView extends StateRefs {
  readonly pool: CompiledTokenEntry[];
  readonly state: TokenFieldState;
}

const toFieldView = (
  prop: DirectStyleProperty,
  value: string,
  entries: CompiledTokenEntry[],
  mode: TokenMode
): FieldView => {
  const state = tokenFieldState(prop, value, entries, mode);

  return {
    ...toStateRefs(state),
    pool: tokensForProperty(prop, entries),
    state,
  };
};

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

export {
  findEntry,
  toFieldLabel,
  toMiniLabel,
  toMiniTip,
  toStateTip,
  toFieldView,
};

export type { TokenCreateRequest };
