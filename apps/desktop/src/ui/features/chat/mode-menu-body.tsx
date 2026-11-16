import type { ReactElement } from "react";

import { MODES } from "./composer-menu-model.js";
import type { ComposerMode } from "./composer-mode-model.js";
import { copy } from "./copy.js";
import { MenuSection } from "./menu-section.js";
import { ModeChoice } from "./mode-choice.js";

const ModeMenuBody = ({
  mode,
  onMode,
}: {
  mode: ComposerMode;
  onMode: (mode: ComposerMode) => void;
}): ReactElement => (
  <MenuSection label={copy.mode}>
    {MODES.map((choice) => (
      <ModeChoice
        key={choice}
        choice={choice}
        isChecked={mode === choice}
        onMode={onMode}
      />
    ))}
  </MenuSection>
);

export { ModeMenuBody };
