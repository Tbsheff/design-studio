import { useCallback, useMemo, useState } from "react";

import type { DesignTokens } from "./deps.js";
import type {
  ScopeInput,
  UseInspectorTokensResult,
} from "./token-scope-model.js";
import { useSnapSetting, useTokenSnap } from "./use-token-snap.js";
import type { CreateRequest, TokenUi } from "./use-token-snap.js";

const toTokenUi = (
  tokens: DesignTokens | null,
  snapOn: boolean,
  setSnap: (next: boolean) => void,
  setCreating: (request: CreateRequest) => void
): TokenUi | null => {
  if (!tokens) {
    return null;
  }

  const { entries, mode } = tokens;
  const shouldSnap = snapOn;
  let requestCreate: ((request: CreateRequest) => void) | null = setCreating;

  if (tokens.source) {
    requestCreate = null;
  }

  return { entries, mode, requestCreate, setSnap, shouldSnap };
};

const useInspectorTokens = (input: ScopeInput): UseInspectorTokensResult => {
  const [snapOn, setSnap] = useSnapSetting(input.projectId);
  const snap = useTokenSnap(input.tokens, snapOn);
  const [creating, setCreating] = useState<CreateRequest | null>(null);
  const { tokens } = input;

  const ui = useMemo(
    () => toTokenUi(tokens, snapOn, setSnap, setCreating),
    [tokens, snapOn, setSnap]
  );

  const closeCreate = useCallback(() => setCreating(null), []);

  return { closeCreate, creating, snap, ui };
};

export { useInspectorTokens };
