import type { DraftSourcesState } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { STATUS_ROLE } from "./aria-role-model.js";
import { copy } from "./copy.js";
import { toSummary } from "./draft-sources-model.js";
import { SourcesToggle } from "./sources-toggle.js";

interface SourcesHeadProps {
  readonly isOpen: boolean;
  readonly listId: string;
  readonly onToggle: () => void;
  readonly state: DraftSourcesState;
}

const SourcesHead = ({
  state,
  isOpen,
  listId,
  onToggle,
}: SourcesHeadProps): ReactElement => (
  <div className="ds-src-head">
    <strong>{copy.sources}</strong>
    <span className="ds-src-summary" role={STATUS_ROLE}>
      {!state.done && <span className="spinner" aria-hidden="true" />}
      {toSummary(state)}
    </span>
    {state.done && (
      <SourcesToggle isOpen={isOpen} listId={listId} onToggle={onToggle} />
    )}
  </div>
);

export { SourcesHead };
