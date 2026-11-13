import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { SpellingRow } from "./spelling-row.js";
import type { Spelling } from "./use-spelling.js";

interface SpellingGroupProps {
  readonly directionId: string | null;
  readonly isLive: boolean;
  readonly onSelect: (selector: string) => void;
  readonly spelling: Spelling;
}

const SpellingGroup = ({
  directionId,
  isLive,
  onSelect,
  spelling,
}: SpellingGroupProps): ReactElement | null => {
  const { items } = spelling;

  if (directionId === null || !isLive) {
    return null;
  }

  return (
    <section aria-label={copy.spellingTitle} className="review-group">
      <div className="review-group-head">
        <span className="review-group-name">{copy.spellingTitle}</span>
        <span className="review-count num">{items.length}</span>
        <div className="spacer" />
        {spelling.isBusy && <span className="spinner" />}
      </div>
      {spelling.error !== null && (
        <div className="alert error">{spelling.error}</div>
      )}
      {spelling.isLoading && items.length === 0 && (
        <div className="review-wait">
          <span className="spinner" />
          {copy.spellingChecking}
        </div>
      )}
      {!spelling.isLoading && items.length === 0 && (
        <div className="review-wait">{copy.spellingEmpty}</div>
      )}
      <ul className="review-list">
        {items.map((hit) => (
          <SpellingRow
            hit={hit}
            isBusy={spelling.isBusy}
            key={hit.word}
            onAdd={spelling.handleAdd}
            onFix={spelling.handleFix}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </section>
  );
};

export { SpellingGroup };

export type { SpellingGroupProps };
