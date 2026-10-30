import { useEffect, useId, useState, type KeyboardEvent } from 'react';
import type { RunStatus, RunSummary } from '../../shared/contracts';
import { runQueryTerms } from '../../shared/rewind';
import { formatRelative } from '../format';
import { searchRunPage, SEARCH_LIMIT } from '../runHistoryApi';
import { Icon } from './Icon';

interface Props {
  open: boolean;
  query: string;
  directionId: string | null;
  onOpen: () => void;
  onClose: () => void;
  onQuery: (query: string) => void;
  onPick: (runId: string) => void;
}

interface Hits {
  query: string;
  runs: RunSummary[];
  more: boolean;
  failed: boolean;
}

const DEBOUNCE_MS = 150;

const STATUS_WORD: Record<RunStatus, string> = {
  running: 'Running',
  completed: 'Done',
  canceled: 'Stopped',
  failed: 'Failed',
  budget_exceeded: 'Limit reached',
};

function useRunHits(directionId: string | null, query: string): Hits | null {
  const [hits, setHits] = useState<Hits | null>(null);
  const text = runQueryTerms(query).join(' ');
  useEffect(() => {
    if (!text || !directionId) {
      setHits(null);
      return;
    }
    let alive = true;
    const timer = window.setTimeout(() => {
      searchRunPage(directionId, text)
        .then((page) => alive && setHits({ query: text, runs: page.runs, more: page.nextBefore !== null, failed: false }))
        .catch(() => alive && setHits({ query: text, runs: [], more: false, failed: true }));
    }, DEBOUNCE_MS);
    return () => {
      alive = false;
      window.clearTimeout(timer);
    };
  }, [directionId, text]);
  return hits;
}

function runLabel(run: RunSummary): string {
  const prompt = run.request.prompt.replace(/\s+/g, ' ').trim();
  return run.title || prompt || 'Untitled run';
}

function countText(hits: Hits | null, searching: boolean): string {
  if (!hits || searching) return '';
  if (hits.failed) return '';
  return hits.more ? `${SEARCH_LIMIT}+` : String(hits.runs.length);
}

function HitList({ id, hits, active, searching, onPick, onActive }: { id: string; hits: Hits | null; active: number; searching: boolean; onPick: (runId: string) => void; onActive: (index: number) => void }) {
  if (!hits) return searching ? <p className="chat-search-note">Searching…</p> : null;
  if (hits.failed) return <p className="chat-search-note">Search failed. Try again.</p>;
  if (hits.runs.length === 0) return <p className="chat-search-note">No run matches “{hits.query}”.</p>;
  return (
    <ul className="chat-search-hits" id={id} role="listbox" aria-label="Matching runs">
      {hits.runs.map((run, index) => (
        <li
          key={run.id}
          id={`${id}-${index}`}
          role="option"
          aria-selected={index === active}
          className="ui-menu-item chat-search-hit"
          data-highlighted={index === active || undefined}
          onMouseEnter={() => onActive(index)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onPick(run.id)}
        >
          <span className={`status ${run.status}`} data-tip={STATUS_WORD[run.status]}>
            <span className="status-dot" aria-hidden="true" />
            <span className="sr-only">{STATUS_WORD[run.status]}</span>
          </span>
          <span className="chat-search-hit-label">{runLabel(run)}</span>
          <span className="ui-menu-meta tabular-nums">{formatRelative(run.startedAt)}</span>
        </li>
      ))}
    </ul>
  );
}

export function ChatSearch({ open, query, directionId, onOpen, onClose, onQuery, onPick }: Props) {
  const id = useId();
  const hits = useRunHits(open ? directionId : null, query);
  const [active, setActive] = useState(0);
  const text = runQueryTerms(query).join(' ');
  const searching = text !== '' && hits?.query !== text;
  const runs = hits?.runs ?? [];
  useEffect(() => setActive(0), [hits]);
  if (!open) {
    return (
      <div className="chat-search closed">
        <button type="button" className="icon-btn small chat-search-toggle" aria-label="Search runs" data-tip="Search runs" data-tip-align="end" onClick={onOpen}>
          <Icon name="search" size={14} />
        </button>
      </div>
    );
  }
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      onClose();
      return;
    }
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (runs.length === 0) return;
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((index) => (index + step + runs.length) % runs.length);
      return;
    }
    const picked = runs[active];
    if (event.key === 'Enter' && picked) {
      event.preventDefault();
      onPick(picked.id);
    }
  };
  const count = countText(hits, searching);
  return (
    <div className="chat-search" role="search">
      <div className="chat-search-bar">
        <Icon name="search" size={14} className="chat-search-icon" />
        <input
          autoFocus
          type="search"
          role="combobox"
          className="chat-search-input"
          aria-label="Search runs"
          aria-expanded={text !== ''}
          aria-controls={id}
          aria-activedescendant={runs[active] ? `${id}-${active}` : undefined}
          placeholder="Search all runs by prompt or name"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          onKeyDown={onKeyDown}
        />
        {count && (
          <span className="chat-search-count tabular-nums" aria-live="polite" data-testid="chat-search-count">
            {count}
          </span>
        )}
        <button type="button" className="icon-btn small" aria-label="Close search" data-tip="Close (Esc)" data-tip-align="end" onClick={onClose}>
          <Icon name="close" size={14} />
        </button>
      </div>
      {text !== '' && (
        <div className="chat-search-results">
          <HitList id={id} hits={hits} active={active} searching={searching} onPick={onPick} onActive={setActive} />
        </div>
      )}
    </div>
  );
}
