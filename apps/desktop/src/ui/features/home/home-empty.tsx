import type { Starter } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { FoundList } from "./found-list.js";
import { StartCards } from "./start-cards.js";

const HomeEmpty = ({
  isBusy,
  onUse,
  onSample,
  onStarter,
}: {
  readonly isBusy: boolean;
  readonly onUse: (path: string) => void;
  readonly onSample: () => void;
  readonly onStarter: (starter: Starter) => void;
}): ReactElement => (
  <div className="home-empty-state">
    <div className="home-empty-grid">
      <FoundList onUse={onUse} />
      <StartCards isBusy={isBusy} onSample={onSample} onStarter={onStarter} />
    </div>
    <p className="home-empty-note">{copy.labelUsePicksTheAppReturn}</p>
  </div>
);

export { HomeEmpty };
