import type { RunEffort } from "@design-studio/contracts";
import type { ReactElement } from "react";

import type { ComposerMode } from "./composer-mode-model.js";
import { copy } from "./copy.js";
import { EffortChoice } from "./effort-choice.js";
import { MenuSection } from "./menu-section.js";
import { ModeChoice } from "./mode-choice.js";
import { EFFORTS, MODES } from "./run-settings-model.js";

const ModeMenuBody = ({
  mode,
  effort,
  onMode,
  onEffort,
  onClose,
}: {
  readonly mode: ComposerMode;
  readonly effort: RunEffort | null;
  readonly onMode: (mode: ComposerMode) => void;
  readonly onEffort: (effort: RunEffort | null) => void;
  readonly onClose: (refocus: boolean) => void;
}): ReactElement => {
  const shownEffort = effort ?? "auto";

  return (
    <>
      <MenuSection label={copy.mode}>
        {MODES.map((choice) => (
          <ModeChoice
            key={choice}
            choice={choice}
            isChecked={mode === choice}
            onMode={onMode}
            onClose={onClose}
          />
        ))}
      </MenuSection>
      <MenuSection label={copy.effort}>
        {EFFORTS.map((choice) => (
          <EffortChoice
            key={choice}
            choice={choice}
            isChecked={shownEffort === choice}
            onEffort={onEffort}
            onClose={onClose}
          />
        ))}
      </MenuSection>
    </>
  );
};

export { ModeMenuBody };
