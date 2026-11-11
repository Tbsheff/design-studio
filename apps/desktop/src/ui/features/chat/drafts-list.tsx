import type { ReactElement } from "react";

import { DRAFT_COUNTS, isDraftOff } from "../../domain/draft-counts.js";
import { copy } from "./copy.js";
import { DraftsChoice } from "./drafts-choice.js";
import { MenuSection } from "./menu-section.js";
import type { DesignsSetting } from "./run-settings-model.js";

const DraftsList = ({
  designs,
  shown,
  onPick,
}: {
  readonly designs: DesignsSetting;
  readonly shown: number;
  readonly onPick: (count: number) => void;
}): ReactElement => (
  <MenuSection label={copy.drafts}>
    {DRAFT_COUNTS.map((count) => (
      <DraftsChoice
        key={count}
        count={count}
        isChecked={count === shown}
        isOff={isDraftOff(count, designs.max, designs.disabledReason)}
        onPick={onPick}
      />
    ))}
  </MenuSection>
);

export { DraftsList };
