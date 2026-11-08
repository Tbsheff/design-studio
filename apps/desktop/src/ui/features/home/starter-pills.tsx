import type { Starter } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { StarterPill } from "./starter-pill.js";

const StarterPills = ({
  starters,
  isBusy,
  onStarter,
}: {
  readonly starters: Starter[];
  readonly isBusy: boolean;
  readonly onStarter: (starter: Starter) => void;
}): ReactElement => (
  <div className="home-start-pills">
    {starters.map((starter) => (
      <StarterPill
        key={starter.id}
        starter={starter}
        isBusy={isBusy}
        onStarter={onStarter}
      />
    ))}
  </div>
);

export { StarterPills };
