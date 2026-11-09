import { useMemo } from "react";

import type { TokenDraft } from "./use-token-draft.js";
import { useTokenUsage } from "./use-token-usage.js";
import type { TokenUsage } from "./use-token-usage.js";
import { useTokenView } from "./use-token-view.js";

interface TokensPanelSetup {
  readonly draft: TokenDraft;
  readonly onSelectSite: (selector: string) => void;
  readonly query: string;
  readonly tokens: Parameters<typeof useTokenView>[0];
  readonly usageScope: {
    projectId: string;
    directionId: string | null;
  } | null;
}

interface TokensPanelState {
  readonly usage: TokenUsage;
  readonly view: ReturnType<typeof useTokenView>;
}

const useTokensPanel = (setup: TokensPanelSetup): TokensPanelState => {
  const { draft, onSelectSite, query, tokens, usageScope } = setup;
  const directionId = usageScope?.directionId ?? null;
  const projectId = usageScope?.projectId ?? "";
  const usage = useTokenUsage({ directionId, onSelectSite, projectId });

  const { filterEntries } = usage;

  const shownTokens = useMemo(
    () => ({ entries: filterEntries(tokens.entries), file: tokens.file }),
    [filterEntries, tokens.entries, tokens.file]
  );

  const view = useTokenView(shownTokens, draft, query);

  return { usage, view };
};

export { useTokensPanel };
