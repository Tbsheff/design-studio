import { Icon } from "@design-studio/ui";
import { Suspense, useState } from "react";
import type { ReactNode } from "react";

import {
  broadcastTokenCss,
  holdTokenCssUntilReload,
} from "../design-system/token-frames.js";
import type { DesignTokens } from "../design-system/use-design-system-state.js";
import { ThemeStrip } from "../theme/index.js";
import { TokenSweepSlot, tokenSweepCopy } from "../token-sweep/index.js";
import { TokenExportMenu } from "./token-export-menu.js";
import { TokensFooter } from "./tokens-footer.js";
import { TokensPanelHead } from "./tokens-panel-head.js";
import { TokensSearch } from "./tokens-search.js";
import { TokensSections } from "./tokens-sections.js";
import { TokensSource } from "./tokens-source.js";
import type { TokenDraft } from "./use-token-draft.js";
import { useTokenView } from "./use-token-view.js";

const ALERT_SIZE = 13;

interface TokensPanelProps {
  tokens: DesignTokens;
  draft: TokenDraft;
  sweep?: { projectId: string; directionId: string | null };
}

const TokensPanel = ({ tokens, draft, sweep }: TokensPanelProps): ReactNode => {
  const [query, setQuery] = useState("");
  const [sweepOpen, setSweepOpen] = useState(false);
  const { setTheme: handleTheme } = draft;
  const view = useTokenView(tokens, draft, query);
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
      {draft.errors[""] && (
        <p className="ins-error" role="alert">
          <Icon name="alert" size={ALERT_SIZE} />
          {draft.errors[""]}
        </p>
      )}
      <TokensSections
        baseOf={view.baseOf}
        draft={draft}
        query={query}
        sections={view.sections}
        shownOf={view.shownOf}
        showDark={showDark}
        swatchFor={view.swatchFor}
      />
      <TokensFooter draft={draft} />
    </div>
  );
};

export { TokensPanel };

export type { TokensPanelProps };
