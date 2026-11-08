import type { StyleKind } from "@design-studio/contracts/style-search";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { Candidate } from "./match-candidates-model.js";
import { PickerOption } from "./match-picker-option.js";

const PickerList = ({
  kind,
  shown,
  onPick,
}: {
  readonly kind: StyleKind;
  readonly shown: Candidate[];
  readonly onPick: (token: string) => void;
}): ReactElement => (
  <div className="sm-picker-list">
    {shown.map((candidate) => (
      <PickerOption
        key={candidate.token}
        kind={kind}
        candidate={candidate}
        onPick={onPick}
      />
    ))}
    {shown.length === 0 && (
      <p className="sm-empty">{copy.typeACssVariableOr}</p>
    )}
  </div>
);

export { PickerList };
