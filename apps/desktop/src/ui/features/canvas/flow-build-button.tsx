import type { ReactElement } from "react";

import { copy } from "./copy.js";

const toBuildLabel = (count: number, isPending: boolean): string => {
  if (isPending) {
    return copy.readingTheSource;
  }

  if (count === 0) {
    return copy.pickRoutesForTheFlow;
  }

  if (count === 1) {
    return `Build flow from ${count} route`;
  }

  return `Build flow from ${count} routes`;
};

const FlowBuildButton = ({
  count,
  isPending,
  onBuild,
}: {
  count: number;
  isPending: boolean;
  onBuild: () => void;
}): ReactElement => (
  <button
    type="button"
    className="btn small primary"
    disabled={isPending || count === 0}
    onClick={onBuild}
    data-tip={copy.layOutThe}
  >
    {toBuildLabel(count, isPending)}
  </button>
);

export { FlowBuildButton };
