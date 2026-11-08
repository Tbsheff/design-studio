import type { PackSummary } from "@design-studio/contracts";
import type { ReactElement, ReactNode } from "react";

import { NoneCard } from "./none-card.js";
import { PackCard } from "./pack-card.js";

const PackFace = ({
  children,
  pack,
}: {
  children: ReactNode;
  pack: PackSummary | null;
}): ReactElement => {
  if (!pack) {
    return <NoneCard />;
  }

  return <PackCard pack={pack}>{children}</PackCard>;
};

export { PackFace };
