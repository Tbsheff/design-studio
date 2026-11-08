import type { Version } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactNode } from "react";

import { displayTitle, indexVersions } from "./version-labels.js";

const ARROW_SIZE = 12;
const GROUP_ROLE = "group";
const SIDE_A = "A";
const SIDE_B = "B";

interface ComparePairProps {
  readonly newer: Version;
  readonly older: Version;
}

const ComparePair = ({ newer, older }: ComparePairProps): ReactNode => {
  const index = indexVersions([older, newer]);
  const first = displayTitle(older, index);
  const second = displayTitle(newer, index);

  return (
    <div
      className="compare-code-summary"
      role={GROUP_ROLE}
      aria-label={`Comparing A: ${first} to B: ${second}`}
    >
      <span className="badge accent">{SIDE_A}</span>
      <span className="truncate" data-tip={first}>
        {first}
      </span>
      <Icon name="arrowRight" size={ARROW_SIZE} />
      <span className="badge accent">{SIDE_B}</span>
      <span className="truncate" data-tip={second}>
        {second}
      </span>
    </div>
  );
};

export { ComparePair };
