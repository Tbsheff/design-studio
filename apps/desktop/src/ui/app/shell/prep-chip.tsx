import type { FirstVersionState } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy";
import { prepTip, toPendingStart, useSecondsSince } from "./prep-chip-model";

const PrepChip = ({
  firstVersion,
}: {
  firstVersion: FirstVersionState | null;
}): ReactElement | null => {
  const seconds = useSecondsSince(toPendingStart(firstVersion));

  if (firstVersion?.error) {
    return (
      <span
        className="app-prep-chip failed"
        data-tip={`The first version was not saved: ${firstVersion.error}`}
      >
        {copy.notSaved}
      </span>
    );
  }

  if (!firstVersion?.pending) {
    return null;
  }

  return (
    <output className="app-prep-chip" data-tip={prepTip(firstVersion)}>
      {copy.preparing}
      {seconds}
      {copy.secondsSuffix}
    </output>
  );
};

export { PrepChip };
