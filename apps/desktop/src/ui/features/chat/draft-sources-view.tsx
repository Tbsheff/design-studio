import type { DraftSourcesState, RunStatus } from "@design-studio/contracts";
import { useCallback, useId, useState } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toImproveNote, toVisibleSources } from "./draft-sources-model.js";
import { SourceRow } from "./source-row.js";
import { SourcesHead } from "./sources-head.js";

interface DraftSourcesProps {
  readonly improveEnd: RunStatus | null;
  readonly state: DraftSourcesState | null;
}

const DraftSources = ({
  state,
  improveEnd,
}: DraftSourcesProps): ReactElement | null => {
  const [isOpen, setIsOpen] = useState(false);
  const listId = useId();

  const onToggle = useCallback((): void => {
    setIsOpen((value) => !value);
  }, []);

  if (!state || state.sources.length === 0) {
    return null;
  }

  const note = toImproveNote(state, improveEnd);
  const rows = toVisibleSources(state, isOpen);

  return (
    <section
      className="ds-sources"
      aria-label={copy.sources}
      aria-busy={!state.done}
    >
      <SourcesHead
        state={state}
        isOpen={isOpen}
        listId={listId}
        onToggle={onToggle}
      />
      {rows.length > 0 && (
        <ul className="ds-src-list" id={listId}>
          {rows.map((source) => (
            <SourceRow key={source.id} source={source} />
          ))}
        </ul>
      )}
      {note && <p className="ds-src-note">{note}</p>}
    </section>
  );
};

export { DraftSources };
