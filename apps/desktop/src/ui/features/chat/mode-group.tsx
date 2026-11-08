import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ModeToggle } from "./mode-toggle.js";
import { MODE_HINT } from "./run-settings-model.js";
import type { ModeSetting } from "./run-settings-model.js";

const ModeGroup = ({
  mode,
  hintId,
}: {
  mode: ModeSetting;
  hintId: string;
}): ReactElement => (
  <section className="rs-group">
    <h3 className="rs-label">{copy.mode}</h3>
    <ModeToggle mode={mode} hintId={hintId} />
    <p className="rs-hint" id={hintId}>
      {MODE_HINT[mode.value]}
    </p>
  </section>
);

export { ModeGroup };
