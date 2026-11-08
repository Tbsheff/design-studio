import type { Starter } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { SampleCard } from "./sample-card.js";
import { StarterPills } from "./starter-pills.js";
import { useStarters } from "./use-starters.js";

const StartCards = ({
  isBusy,
  onSample,
  onStarter,
}: {
  readonly isBusy: boolean;
  readonly onSample: () => void;
  readonly onStarter: (starter: Starter) => void;
}): ReactElement => {
  const starters = useStarters();

  return (
    <div className="home-start">
      <SampleCard isBusy={isBusy} onSample={onSample} />
      <div className="home-start-card">
        <b>{copy.orStartFrom}</b>
        <StarterPills
          starters={starters}
          isBusy={isBusy}
          onStarter={onStarter}
        />
      </div>
    </div>
  );
};

export { StartCards };
