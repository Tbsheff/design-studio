import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { EffortToggle } from "./effort-toggle.js";
import { EFFORT_HINT } from "./run-settings-model.js";
import type { EffortSetting } from "./run-settings-model.js";

const EffortGroup = ({
  effort,
  hintId,
}: {
  effort: EffortSetting;
  hintId: string;
}): ReactElement => (
  <section className="rs-group">
    <h3 className="rs-label">{copy.effort}</h3>
    <EffortToggle effort={effort} hintId={hintId} />
    <p className="rs-hint" id={hintId}>
      {EFFORT_HINT[effort.value ?? "auto"]}
    </p>
  </section>
);

export { EffortGroup };
