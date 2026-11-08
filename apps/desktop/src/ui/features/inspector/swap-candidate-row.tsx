import type { ReactElement } from "react";
import { useCallback } from "react";

import type { SwapCandidate } from "../../../shared/component-create.js";
import { toRowHint } from "./swap-model.js";

const SwapCandidateRow = ({
  candidate,
  busyName,
  onPick,
}: {
  readonly candidate: SwapCandidate;
  readonly busyName: string | null;
  readonly onPick: (candidate: SwapCandidate) => void;
}): ReactElement => {
  const pickCandidate = useCallback(
    () => onPick(candidate),
    [onPick, candidate]
  );

  return (
    <button
      type="button"
      role="menuitem"
      className="ui-menu-item"
      disabled={busyName !== null}
      data-tip={candidate.file}
      onClick={pickCandidate}
    >
      <span>{candidate.name}</span>
      <span className="prp-swap-hint">{toRowHint(candidate, busyName)}</span>
    </button>
  );
};

export { SwapCandidateRow };
