import { useEffect, useMemo, useState } from 'react';
import { fuzzyRank } from '../../shared/fuzzy';

export function useHistorySearch(history: readonly string[]) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const shown = useMemo(() => fuzzyRank([...history].reverse(), query, (prompt) => prompt, 20), [history, query]);
  useEffect(() => setActive(0), [query, open]);
  const current = shown[Math.min(active, Math.max(0, shown.length - 1))] ?? null;
  return {
    open,
    query,
    shown,
    current,
    setQuery,
    start: () => {
      setQuery('');
      setOpen(true);
    },
    close: () => setOpen(false),
    move: (step: 1 | -1) => setActive((index) => (shown.length === 0 ? 0 : (index + step + shown.length) % shown.length)),
  };
}

export function HistorySearch({ search, onPick }: { search: ReturnType<typeof useHistorySearch>; onPick: (prompt: string) => void }) {
  if (!search.open) return null;
  return (
    <div className="skill-pop history-pop" role="dialog" aria-label="Search past prompts" data-testid="history-search">
      <input
        autoFocus
        className="skill-search"
        aria-label="Search past prompts"
        placeholder="Search past prompts"
        value={search.query}
        onChange={(event) => search.setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') search.close();
          else if (event.key === 'Enter' && search.current) onPick(search.current);
          else if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || (event.ctrlKey && event.key === 'r')) search.move(event.key === 'ArrowUp' ? -1 : 1);
          else return;
          event.preventDefault();
          event.stopPropagation();
        }}
      />
      <ul role="listbox" aria-label="Past prompts" className="skill-opts">
        {search.shown.map((prompt) => (
          <li
            key={prompt}
            role="option"
            aria-selected={prompt === search.current}
            className={`skill-opt ${prompt === search.current ? 'active' : ''}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onPick(prompt)}
          >
            <span className="skill-opt-desc history-text">{prompt}</span>
          </li>
        ))}
        {search.shown.length === 0 && <li className="skill-empty">No past prompt matches.</li>}
      </ul>
      <p className="skill-pop-foot">Ctrl+R or ↓ for the next match, Enter to use, Esc to close</p>
    </div>
  );
}
