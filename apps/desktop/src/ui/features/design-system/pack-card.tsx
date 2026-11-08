import type { PackSummary } from "@design-studio/contracts";
import type { ReactElement, ReactNode } from "react";

import { PackName } from "./pack-name.js";
import { PackSpecimen } from "./pack-specimen.js";

const PackCard = ({
  children,
  pack,
}: {
  children: ReactNode;
  pack: PackSummary;
}): ReactElement => (
  <>
    <PackSpecimen pack={pack} />
    <span className="pack-text" data-tip={pack.description}>
      <PackName pack={pack} />
      <span className="pack-desc">{pack.description}</span>
      {children}
    </span>
  </>
);

export { PackCard };
