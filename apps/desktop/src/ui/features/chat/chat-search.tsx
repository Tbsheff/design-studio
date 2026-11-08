import { useId, useState } from "react";
import type { ReactElement } from "react";

import { runQueryTerms } from "../../../shared/rewind.js";
import { SEARCH_ROLE } from "./aria-role-model.js";
import { ChatSearchBar } from "./chat-search-bar.js";
import { countText } from "./chat-search-hits-model.js";
import { HitList } from "./hit-list.js";
import { useRunHits } from "./use-run-hits.js";
import { useSearchKeys } from "./use-search-keys.js";

interface Props {
  query: string;
  directionId: string | null;
  onClose: () => void;
  onQuery: (query: string) => void;
  onPick: (runId: string) => void;
}

const toActiveId = (
  id: string,
  runs: readonly unknown[],
  active: number
): string | null => {
  if (runs[active]) {
    return `${id}-${active}`;
  }

  return null;
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
  const [seenHits, setSeenHits] = useState(hits);
  const text = runQueryTerms(query).join(" ");
  const searching = text !== "" && hits?.query !== text;
  const runs = hits?.runs ?? [];

  if (seenHits !== hits) {
    setSeenHits(hits);
    setActive(0);
  }

  const onKey = useSearchKeys({ active, onClose, onPick, runs, setActive });
  const activeId = toActiveId(id, runs, active);

  return (
    <div className="chat-search" role={SEARCH_ROLE}>
      <ChatSearchBar
        activeId={activeId}
        count={countText(hits, searching)}
        isExpanded={text !== ""}
        listId={id}
        query={query}
        onClose={onClose}
        onKey={onKey}
        onQuery={onQuery}
      />
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
