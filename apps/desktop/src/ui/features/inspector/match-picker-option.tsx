import type { StyleKind } from "@design-studio/contracts/style-search";
import type { ReactElement } from "react";
import { useCallback } from "react";

import type { Candidate } from "./match-candidates-model.js";
import { toShownValue } from "./match-candidates-model.js";
import { Swatch } from "./match-swatch.js";

const PickerOption = ({
  kind,
  candidate,
  onPick,
}: {
  readonly kind: StyleKind;
  readonly candidate: Candidate;
  readonly onPick: (token: string) => void;
}): ReactElement => {
  const pick = useCallback(() => onPick(candidate.token), [onPick, candidate]);

  return (
    <button type="button" className="ui-menu-item sm-pick" onClick={pick}>
      <Swatch kind={kind} value={candidate.value} />
      <code className="sm-pick-token">{candidate.token}</code>
      <span className="ui-menu-meta">
        {candidate.hint || toShownValue({ kind, value: candidate.value })}
      </span>
    </button>
  );
};

export { PickerOption };
