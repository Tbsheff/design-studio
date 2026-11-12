import { Suspense, useState } from "react";
import type { ReactNode } from "react";

import {
  broadcastTokenCss,
  holdTokenCssUntilReload,
} from "../design-system/token-frames.js";
import type { DesignTokens } from "../design-system/use-design-system-state.js";
import { ThemeStrip } from "../theme/index.js";
import { TokenSweepSlot, tokenSweepCopy } from "../token-sweep/index.js";
import { TokenUsageContext } from "./token-usage-context.js";
import { toEmptyText } from "./token-usage-model.js";
import { TokensFooter } from "./tokens-footer.js";
import { TokensPanelError } from "./tokens-panel-error.js";
import { TokensPanelHead } from "./tokens-panel-head.js";
import { TokensSearch } from "./tokens-search.js";
import { TokensSections } from "./tokens-sections.js";
import { TokensSource } from "./tokens-source.js";
import { TokensTools } from "./tokens-tools.js";
import type { TokenDraft } from "./use-token-draft.js";
import { useTokensPanel } from "./use-tokens-panel.js";

interface TokensPanelProps {
  tokens: DesignTokens;
  draft: TokenDraft;
  sweep?: { projectId: string; directionId: string | null };
  onSelectSite: (selector: string) => void;
}

const TokensPanel = ({
  tokens,
  draft,
  sweep,
  onSelectSite,
}: TokensPanelProps): ReactNode => {
  const [query, setQuery] = useState("");
  const [sweepOpen, setSweepOpen] = useState(false);

  const { setTheme: handleTheme } = draft;

  const { usage, view } = useTokensPanel({
    draft,
    onSelectSite,
    query,
    tokens,
    usageScope: sweep ?? null,
  });

  return (
    <div className="tkp">
      <TokensPanelHead
        hasSweep={Boolean(sweep)}
        isSweepOpen={sweepOpen}
        sweepLabel={tokenSweepCopy.open}
        sweepTip={tokenSweepCopy.openTip}
        theme={draft.theme}
        onSweepOpen={setSweepOpen}
        onTheme={handleTheme}
      />
      {sweep && sweepOpen && (
        <TokenSweepSlot
          projectId={sweep.projectId}
          directionId={sweep.directionId}
        />
      )}
      {sweep && sweep.directionId !== null && (
        <Suspense fallback={null}>
          <ThemeStrip
            directionId={sweep.directionId}
            onApplied={holdTokenCssUntilReload}
            onPreview={broadcastTokenCss}
            projectId={sweep.projectId}
          />
        </Suspense>
      )}
      {tokens.source && (
        <TokensSource
          darkTokens={tokens.source.darkTokens}
          declarations={tokens.source.declarations}
          file={tokens.source.file}
          tokens={tokens.source.tokens}
        />
      )}
      <TokensSearch query={query} onQuery={setQuery} />
      {sweep && (
        <TokensTools
          isUnusedOnly={usage.isUnusedOnly}
          setup={sweep}
          unusedCount={usage.unusedCount}
          onUnusedToggle={usage.handleToggle}
        />
      )}
      <TokensPanelError message={draft.errors[""] ?? null} />
      <TokenUsageContext.Provider value={usage.lookup}>
        <TokensSections
          baseOf={view.baseOf}
          draft={draft}
          emptyText={toEmptyText(query, usage.isUnusedOnly)}
          query={query}
          sections={view.sections}
          shownOf={view.shownOf}
          showDark={tokens.mode === "light"}
          swatchFor={view.swatchFor}
        />
      </TokenUsageContext.Provider>
      <TokensFooter draft={draft} />
    </div>
  );
};

export { TokensPanel };

export type { TokensPanelProps };
