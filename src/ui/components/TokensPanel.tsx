import { useCallback, useMemo, useState } from 'react';
import type { CompiledTokenEntry } from '../../shared/contracts';
import { aliasPath, rawToken, referencedEntry, shownRaw, tokenSections, varTarget, type RawToken } from '../tokenDraft';
import type { ThemeChoice } from '../tokenFrames';
import type { DesignTokens } from '../useDesignSystemState';
import type { TokenDraft } from '../useTokenDraft';
import { Icon } from './Icon';
import { PanelHead } from './SheetHead';
import { TokenRow } from './TokenRow';

interface Props {
  tokens: DesignTokens;
  draft: TokenDraft;
}

const THEMES: { id: ThemeChoice; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: null, label: 'Auto' },
];

function ThemeToggle({ theme, onTheme }: { theme: ThemeChoice; onTheme: (theme: ThemeChoice) => void }) {
  return (
    <div className="segmented tkp-theme" role="group" aria-label="Preview theme">
      {THEMES.map((t) => (
        <button key={t.label} type="button" className={theme === t.id ? 'on' : ''} aria-pressed={theme === t.id} onClick={() => onTheme(t.id)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

function Footer({ draft }: { draft: TokenDraft }) {
  if (draft.count === 0 && !draft.commitError) return null;
  return (
    <div className="tkp-footer">
      {draft.commitError && (
        <p className="ins-error tkp-commit-error" role="alert">
          <Icon name="alert" size={13} />
          {draft.commitError}
        </p>
      )}
      {draft.count > 0 && (
        <div className="tkp-footer-bar">
          <span className="tkp-count" aria-live="polite">
            {draft.count} {draft.count === 1 ? 'change' : 'changes'}
          </span>
          <button type="button" className="btn small ghost" disabled={draft.committing} onClick={draft.discard}>
            Discard
          </button>
          <button type="button" className="btn small primary" disabled={draft.committing} onClick={() => void draft.commit()}>
            {draft.committing ? 'Committing…' : 'Commit'}
          </button>
        </div>
      )}
    </div>
  );
}

function useSwatch(entries: CompiledTokenEntry[]) {
  return useCallback(
    (value: string, dark: boolean) => {
      if (!aliasPath(value) && !varTarget(value)) return value;
      const entry = referencedEntry(value, entries);
      if (!entry) return '';
      return dark && entry.darkValue ? entry.darkValue : entry.value;
    },
    [entries],
  );
}

export function TokensPanel({ tokens, draft }: Props) {
  const [query, setQuery] = useState('');
  const file = tokens.file;
  const bases = useMemo(() => new Map(tokens.entries.map((entry) => [entry.path, rawToken(file, entry)])), [tokens.entries, file]);
  const baseOf = useCallback((entry: CompiledTokenEntry): RawToken => bases.get(entry.path) ?? rawToken(file, entry), [bases, file]);
  const shownOf = useCallback((entry: CompiledTokenEntry) => shownRaw(baseOf(entry), draft.pending[entry.path]), [baseOf, draft.pending]);
  const sections = useMemo(() => tokenSections(tokens.entries, shownOf, query), [tokens.entries, shownOf, query]);
  const swatchFor = useSwatch(draft.effective?.entries ?? tokens.entries);
  const showDark = tokens.mode === 'light';
  return (
    <div className="tkp">
      <PanelHead title="Tokens" className="ins-header tkp-header" titleClassName="tkp-title">
        <div className="ins-header-end">
          <ThemeToggle theme={draft.theme} onTheme={draft.setTheme} />
        </div>
      </PanelHead>
      {tokens.source && (
        <p className="tkp-source" data-tip={`${tokens.source.declarations} declarations, ${tokens.source.tokens} tokens, ${tokens.source.darkTokens} with a dark value`}>
          <Icon name="token" size={12} />
          <span className="truncate">From {tokens.source.file}</span>
        </p>
      )}
      <div className="tk-search tkp-search">
        <Icon name="search" size={13} />
        <input type="search" aria-label="Filter tokens" placeholder="Filter tokens" value={query} spellCheck={false} onChange={(event) => setQuery(event.target.value)} />
      </div>
      {draft.errors[''] && (
        <p className="ins-error" role="alert">
          <Icon name="alert" size={13} />
          {draft.errors['']}
        </p>
      )}
      <div className="ins-scroll tkp-scroll">
        {sections.length === 0 && <p className="ins-empty tkp-empty">No tokens match “{query}”. Try another name.</p>}
        {sections.map((section) => (
          <section key={section.id} className="tkp-section" aria-labelledby={`tkp-sec-${section.id}`}>
            <h3 className="tkp-section-head" id={`tkp-sec-${section.id}`}>
              {section.label}
              <span className="tkp-section-count">{section.entries.length}</span>
            </h3>
            <ul className="tkp-list">
              {section.entries.map((entry) => (
                <TokenRow
                  key={entry.path}
                  entry={entry}
                  shown={shownOf(entry)}
                  base={baseOf(entry)}
                  pending={draft.pending[entry.path]}
                  error={draft.errors[entry.path]}
                  showDark={showDark}
                  swatchFor={swatchFor}
                  onEdit={draft.edit}
                  onRevert={draft.revert}
                />
              ))}
            </ul>
          </section>
        ))}
      </div>
      <Footer draft={draft} />
    </div>
  );
}
