import { Icon } from "@design-studio/ui";
import { Suspense, useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  broadcastTokenCss,
  holdTokenCssUntilReload,
} from "../design-system/token-frames.js";
import type { DesignTokens } from "../design-system/use-design-system-state.js";
import { ThemeStrip } from "../theme/index.js";
import { TokenSweepSlot, tokenSweepCopy } from "../token-sweep/index.js";
import { TokenExportMenu } from "./token-export-menu.js";
import { TokenUsageChip } from "./token-usage-chip.js";
import { TokenUsageContext } from "./token-usage-context.js";
import { toEmptyText } from "./token-usage-model.js";
import { TokensFooter } from "./tokens-footer.js";
import { TokensPanelHead } from "./tokens-panel-head.js";
import { TokensSearch } from "./tokens-search.js";
import { TokensSections } from "./tokens-sections.js";
import { TokensSource } from "./tokens-source.js";
import type { TokenDraft } from "./use-token-draft.js";
import { useTokenUsage } from "./use-token-usage.js";
import { useTokenView } from "./use-token-view.js";

const ALERT_SIZE = 13;

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
  const directionId = sweep?.directionId ?? null;
  const projectId = sweep?.projectId ?? "";
  const usage = useTokenUsage({ directionId, onSelectSite, projectId });

  const { filterEntries } = usage;

  const shownTokens = useMemo(
    () => ({ entries: filterEntries(tokens.entries), file: tokens.file }),
    [filterEntries, tokens.entries, tokens.file]
  );

  const view = useTokenView(shownTokens, draft, query);
  const showDark = tokens.mode === "light";

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
      {sweep && <TokenExportMenu setup={sweep} />}
      <TokensSearch query={query} onQuery={setQuery} />
      {sweep && usage.unusedCount !== null && (
        <TokenUsageChip
          count={usage.unusedCount}
          isOn={usage.isUnusedOnly}
          onToggle={usage.handleToggle}
        />
      )}
      {draft.errors[""] && (
        <p className="ins-error" role="alert">
          <Icon name="alert" size={ALERT_SIZE} />
          {draft.errors[""]}
        </p>
      )}
      <TokenUsageContext.Provider value={usage.lookup}>
        <TokensSections
          baseOf={view.baseOf}
          draft={draft}
          emptyText={toEmptyText(query, usage.isUnusedOnly)}
          query={query}
          sections={view.sections}
          shownOf={view.shownOf}
          showDark={showDark}
          swatchFor={view.swatchFor}
        />
      </TokenUsageContext.Provider>
      <TokensFooter draft={draft} />
    </div>
  );
};

export { TokensPanel };

export type { TokensPanelProps };
