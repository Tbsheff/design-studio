import type { PackSummary } from "@design-studio/contracts";
import type { ReactElement } from "react";

const PackDescription = ({
  pack,
}: {
  pack: PackSummary | null;
}): ReactElement | null => {
  if (!pack) {
    return null;
  }

  return <span>{pack.description}</span>;
};

export { PackDescription };
