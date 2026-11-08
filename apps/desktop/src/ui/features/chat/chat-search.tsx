import type { RunStatus, RunSummary } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useEffect, useId, useState, startTransition } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import { runQueryTerms } from "../../../shared/rewind.js";
import { formatRelative } from "../../domain/format.js";
import { copy } from "./copy.js";
import { searchRunPage, SEARCH_LIMIT } from "./run-history-model.js";

interface Props {
  query: string;
  directionId: string | null;
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
  budget_exceeded: "Limit reached",
  canceled: "Stopped",
  completed: "Done",
  failed: "Failed",
  running: "Running",
};

const useRunHits = (directionId: string | null, query: string): Hits | null => {
  const [hits, setHits] = useState<Hits | null>(null);
  const text = runQueryTerms(query).join(" ");
  useEffect(() => {
    if (!text || !directionId) {
      setHits(null);

      return;
    }

    let alive = true;

    const timer = globalThis.setTimeout(() => {
      startTransition(async () => {
        try {
          const page = await searchRunPage(directionId, text);

          if (alive) {
            setHits({
              failed: false,
              more: page.nextBefore !== null,
              query: text,
              runs: page.runs,
            });
          }
        } catch {
          if (alive) {
            setHits({ failed: true, more: false, query: text, runs: [] });
          }
        }
      });
    }, DEBOUNCE_MS);

    return (): void => {
      alive = false;
      globalThis.clearTimeout(timer);
    };
  }, [directionId, text]);

  return hits;
};

const runLabel = (run: RunSummary): string => {
  const prompt = run.request.prompt.replaceAll(/\s+/gu, " ").trim();

  return run.title || prompt || "Untitled run";
};

const countText = (hits: Hits | null, searching: boolean): string => {
  if (!hits || searching) {
    return "";
  }

  if (hits.failed) {
    return "";
  }

  return hits.more ? `${SEARCH_LIMIT}+` : String(hits.runs.length);
};

const HitList = ({
  id,
  hits,
  active,
  searching,
  onPick,
  onActive,
}: {
  id: string;
  hits: Hits | null;
  active: number;
  searching: boolean;
  onPick: (runId: string) => void;
  onActive: (index: number) => void;
}): ReactElement | null => {
  if (!hits) {
    return searching ? <p className="chat-search-note">Searching…</p> : null;
  }

  if (hits.failed) {
    return <p className="chat-search-note">Search failed. Try again.</p>;
  }

  if (hits.runs.length === 0) {
    return <p className="chat-search-note">No run matches “{hits.query}”.</p>;
  }

  return (
    <ul
      className="chat-search-hits"
      id={id}
      role="listbox"
      aria-label={copy.matchingRuns}
    >
      {hits.runs.map((run, index) => (
        <li
          key={run.id}
          id={`${id}-${index}`}
          role="option"
          aria-selected={index === active}
          className="ui-menu-item chat-search-hit"
          data-highlighted={index === active || null}
          onMouseEnter={() => onActive(index)}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onPick(run.id)}
        >
          <span
            className={`status ${run.status}`}
            data-tip={STATUS_WORD[run.status]}
          >
            <span className="status-dot" aria-hidden="true" />
            <span className="sr-only">{STATUS_WORD[run.status]}</span>
          </span>
          <span className="chat-search-hit-label">{runLabel(run)}</span>
          <span className="ui-menu-meta tabular-nums">
            {formatRelative(run.startedAt)}
          </span>
        </li>
      ))}
    </ul>
  );
};

const ChatSearch = ({
  query,
  directionId,
  onClose,
  onQuery,
  onPick,
}: Props): ReactElement => {
  const id = useId();
  const hits = useRunHits(directionId, query);
  const [active, setActive] = useState(0);
  const text = runQueryTerms(query).join(" ");
  const searching = text !== "" && hits?.query !== text;
  const runs = hits?.runs ?? [];
  useEffect(() => setActive(0), [hits]);

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      event.stopPropagation();
      onClose();

      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (runs.length === 0) {
        return;
      }

      event.preventDefault();
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) => (index + step + runs.length) % runs.length);

      return;
    }

    const picked = runs[active];

    if (event.key === "Enter" && picked) {
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
          type="search"
          role="combobox"
          className="chat-search-input"
          aria-label={copy.searchRuns}
          aria-expanded={text !== ""}
          aria-controls={id}
          aria-activedescendant={runs[active] ? `${id}-${active}` : undefined}
          placeholder={copy.searchAllRuns}
          value={query}
          onChange={(event) => onQuery(event.target.value)}
          onKeyDown={onKeyDown}
        />
        {count && (
          <span
            className="chat-search-count tabular-nums"
            aria-live="polite"
            data-testid="chat-search-count"
          >
            {count}
          </span>
        )}
        <button
          type="button"
          className="icon-btn small"
          aria-label={copy.closeSearch}
          data-tip={copy.closeEsc}
          data-tip-side="top"
          data-tip-align="end"
          onClick={onClose}
        >
          <Icon name="close" size={14} />
        </button>
      </div>
      {text !== "" && (
        <div className="chat-search-results">
          <HitList
            id={id}
            hits={hits}
            active={active}
            searching={searching}
            onPick={onPick}
            onActive={setActive}
          />
        </div>
      )}
    </div>
  );
};

export { ChatSearch };
