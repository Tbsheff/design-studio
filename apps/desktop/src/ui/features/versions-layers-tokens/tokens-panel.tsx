import type { CompiledTokenEntry } from "@design-studio/contracts";
import { Icon, PanelHead } from "@design-studio/ui";
import { Suspense, useCallback, useMemo, useState } from "react";
import type { ReactNode } from "react";

import {
  broadcastTokenCss,
  holdTokenCssUntilReload,
} from "../design-system/token-frames.js";
import type { DesignTokens } from "../design-system/use-design-system-state.js";
import { ThemeStrip } from "../theme/index.js";
import { TokenSweepSlot, tokenSweepCopy } from "../token-sweep/index.js";
import { COPY } from "./copy.js";
import { rawToken, shownRaw, tokenSections } from "./token-draft.js";
import type { RawToken } from "./token-draft.js";
import { TokenExportMenu } from "./token-export-menu.js";
import { TokensFooter } from "./tokens-footer.js";
import { TokensHeaderEnd } from "./tokens-header-end.js";
import { TokensSearch } from "./tokens-search.js";
import { TokensSections } from "./tokens-sections.js";
import { TokensSource } from "./tokens-source.js";
import { useSwatch } from "./use-swatch.js";
import type { TokenDraft } from "./use-token-draft.js";

const ALERT_SIZE = 13;

interface TokensPanelProps {
  tokens: DesignTokens;
  draft: TokenDraft;
  sweep?: { projectId: string; directionId: string | null };
}

const TokensPanel = ({ tokens, draft, sweep }: TokensPanelProps): ReactNode => {
  const [query, setQuery] = useState("");
  const [sweepOpen, setSweepOpen] = useState(false);
  const { file } = tokens;

  const bases = useMemo(
    () =>
      new Map(
        tokens.entries.map((entry) => [entry.path, rawToken(file, entry)])
      ),
    [tokens.entries, file]
  );

  const baseOf = useCallback(
    (entry: CompiledTokenEntry): RawToken =>
      bases.get(entry.path) ?? rawToken(file, entry),
    [bases, file]
  );

  const shownOf = useCallback(
    (entry: CompiledTokenEntry): RawToken =>
      shownRaw(baseOf(entry), draft.pending[entry.path]),
    [baseOf, draft.pending]
  );

  const sections = useMemo(
    () => tokenSections(tokens.entries, shownOf, query),
    [tokens.entries, shownOf, query]
  );

  const swatchFor = useSwatch(draft.effective?.entries ?? tokens.entries);
  const showDark = tokens.mode === "light";

  return (
    <div className="tkp">
      <PanelHead
        title={COPY.titleTokens}
        className="ins-header tkp-header"
        titleClassName="tkp-title"
      >
        <TokensHeaderEnd
          hasSweep={Boolean(sweep)}
          isSweepOpen={sweepOpen}
          sweepLabel={tokenSweepCopy.open}
          sweepTip={tokenSweepCopy.openTip}
          theme={draft.theme}
          onSweepOpen={setSweepOpen}
          onTheme={draft.setTheme}
        />
      </PanelHead>
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
        baseOf={baseOf}
        draft={draft}
        query={query}
        sections={sections}
        shownOf={shownOf}
        showDark={showDark}
        swatchFor={swatchFor}
      />
      <TokensFooter draft={draft} />
    </div>
  );
};

export { TokensPanel };

export type { TokensPanelProps };
