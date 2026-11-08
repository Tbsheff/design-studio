import type { ReactElement } from "react";

import { DesignCountButton } from "./design-count-button.js";
import { designsHint } from "./run-settings-model.js";
import type { DesignsSetting } from "./run-settings-model.js";

const MAX_DESIGN_COUNT = 4;

const toCounts = (max: number): number[] => {
  const counts: number[] = [];

  for (let count = 1; count <= Math.min(max, MAX_DESIGN_COUNT); count += 1) {
    counts.push(count);
  }

  return counts;
};

const DesignCounts = ({
  countsId,
  designs,
}: {
  countsId: string;
  designs: DesignsSetting;
}): ReactElement => (
  <>
    <div className="composer-menu-counts" aria-describedby={`${countsId}-hint`}>
      {toCounts(designs.max).map((count) => (
        <DesignCountButton key={count} count={count} designs={designs} />
      ))}
    </div>
    <p
      className="ui-menu-hint composer-menu-counts-hint"
      id={`${countsId}-hint`}
    >
      {designsHint(designs)}
    </p>
  </>
);

export { DesignCounts };
