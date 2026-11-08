import type { FirstVersionState } from "@design-studio/contracts";

import { useNow } from "../../platform/clock";

const SECOND_MS = 1000;

const useSecondsSince = (startedAt: number | null): number => {
  const now = useNow(startedAt !== null, SECOND_MS);

  if (startedAt === null) {
    return 0;
  }

  return Math.max(0, Math.round((now - startedAt) / SECOND_MS));
};

const toFilesText = (files: number | null): string => {
  if (files) {
    return ` of ${files.toLocaleString("en-US")} files`;
  }

  return "";
};

const prepTip = (firstVersion: FirstVersionState): string =>
  `Saving the first version${toFilesText(firstVersion.files ?? null)} so edits can be undone. Screenshots work now; edits wait for it. About ${firstVersion.etaSeconds} s left.`;

const toPendingStart = (
  firstVersion: FirstVersionState | null
): number | null => {
  if (firstVersion?.pending) {
    return firstVersion.startedAt;
  }

  return null;
};

export { prepTip, toPendingStart, useSecondsSince };
