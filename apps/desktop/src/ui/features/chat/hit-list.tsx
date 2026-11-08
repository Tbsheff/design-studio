import type { ReactElement } from "react";

import { LISTBOX_ROLE } from "./aria-role-model.js";
import { ChatSearchHit } from "./chat-search-hit.js";
import type { Hits } from "./chat-search-hits-model.js";
import { copy } from "./copy.js";

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
    if (searching) {
      return <p className="chat-search-note">{copy.searching}</p>;
    }

    return null;
  }

  if (hits.failed) {
    return <p className="chat-search-note">{copy.searchFailedTryAgain}</p>;
  }

  if (hits.runs.length === 0) {
    return (
      <p className="chat-search-note">
        {copy.noRunMatches}
        {hits.query}
        {copy.text2}
      </p>
    );
  }

  return (
    <ul
      className="chat-search-hits"
      id={id}
      role={LISTBOX_ROLE}
      aria-label={copy.matchingRuns}
    >
      {hits.runs.map((run, index) => (
        <ChatSearchHit
          key={run.id}
          id={`${id}-${index}`}
          index={index}
          isActive={index === active}
          run={run}
          onActive={onActive}
          onPick={onPick}
        />
      ))}
    </ul>
  );
};

export { HitList };
