import type { FirstVersionState } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { useNow } from "../../platform/clock";
import { copy } from "./copy";

const SECOND_MS = 1000;

const useSecondsSince = (startedAt: number | null): number => {
  const now = useNow(startedAt !== null, SECOND_MS);

  if (startedAt === null) {
    return 0;
  }

  return Math.max(0, Math.round((now - startedAt) / 1000));
};

const prepTip = (firstVersion: FirstVersionState): string => {
  const files = firstVersion.files
    ? ` of ${firstVersion.files.toLocaleString("en-US")} files`
    : "";

  return `Saving the first version${files} so edits can be undone. Screenshots work now; edits wait for it. About ${firstVersion.etaSeconds} s left.`;
};

const PrepChip = ({
  firstVersion,
}: {
  firstVersion: FirstVersionState | null;
}): ReactElement | null => {
  const seconds = useSecondsSince(
    firstVersion?.pending ? firstVersion.startedAt : null
  );

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
    <span
      className="app-prep-chip"
      role="status"
      data-tip={prepTip(firstVersion)}
    >
      {copy.preparing}
      {seconds}
      {copy.secondsSuffix}
    </span>
  );
};

export { useSecondsSince, prepTip, PrepChip };
