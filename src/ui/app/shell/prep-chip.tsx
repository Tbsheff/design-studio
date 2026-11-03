import { useEffect, useState } from "react";

import type { FirstVersionState } from "../../../shared/contracts";

function useSecondsSince(startedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt === null) {
      return;
    }

    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => window.clearInterval(timer);
  }, [startedAt]);

  return startedAt === null
    ? 0
    : Math.max(0, Math.round((now - startedAt) / 1000));
}

function prepTip(firstVersion: FirstVersionState): string {
  const files = firstVersion.files
    ? ` of ${firstVersion.files.toLocaleString("en-US")} files`
    : "";

  return `Saving the first version${files} so edits can be undone. Screenshots work now; edits wait for it. About ${firstVersion.etaSeconds} s left.`;
}

function PrepChip({
  firstVersion,
}: {
  firstVersion: FirstVersionState | null;
}) {
  const seconds = useSecondsSince(
    firstVersion?.pending ? firstVersion.startedAt : null
  );

  if (firstVersion?.error) {
    return (
      <span
        className="app-prep-chip failed"
        data-tip={`The first version was not saved: ${firstVersion.error}`}
      >
        Not saved
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
      Preparing… {seconds} s
    </span>
  );
}

export { useSecondsSince, prepTip, PrepChip };
