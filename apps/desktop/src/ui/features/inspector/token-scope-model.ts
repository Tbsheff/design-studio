import type { SelectionContext } from "@design-studio/contracts";

import type { StyleValues } from "./css-value-model.js";
import type {
  CreateRequest,
  DesignTokens,
  DirectEditCommit,
  SnapNote,
  TokenUi,
} from "./deps.js";

interface ScopeInput {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly selection: SelectionContext;
  readonly tokens: DesignTokens | null;
  readonly onCommitted: (commit: DirectEditCommit) => void;
}

interface UseInspectorTokensResult {
  readonly closeCreate: () => void;
  readonly creating: CreateRequest | null;
  readonly snap: {
    readonly dismiss: () => void;
    readonly keepRaw: (raw: Partial<StyleValues>) => void;
    readonly note: SnapNote | null;
    readonly rewrite: (style: Partial<StyleValues>) => Partial<StyleValues>;
  };
  readonly ui: TokenUi | null;
}

export type { ScopeInput, UseInspectorTokensResult };
