import { Button } from "@design-studio/ui";
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

const toBuildReason = (count: number): string | null => {
  if (count === 0) {
    return copy.pickRoutesFirst;
  }

  return null;
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
  <Button
    disabledReason={toBuildReason(count)}
    isLoading={isPending}
    label={null}
    onClick={onBuild}
    size="sm"
    tip={copy.layOutThe}
    variant="primary"
  >
    {toBuildLabel(count, isPending)}
  </Button>
);

export { FlowBuildButton };
