import type { PackSummary } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { PackSwatches } from "./project-card-model.js";

interface CardPackProps {
  readonly pack: PackSummary;
  readonly toSwatches: PackSwatches;
}

const CardPack = ({ pack, toSwatches }: CardPackProps): ReactElement => {
  const label = `${copy.designSystemPrefix} ${pack.name}`;

  return (
    <span className="project-pack" data-tip={label}>
      {toSwatches(pack)}
      <span className="sr-only">{label}</span>
    </span>
  );
};

export { CardPack };
