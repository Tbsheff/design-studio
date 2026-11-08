import type { RunLevel } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { levelLabel } from "./level-model.js";
import { ModelToggle } from "./model-toggle.js";
import { shortModel } from "./slash-groups.js";

const toModelHint = (
  isLocked: boolean,
  level: RunLevel,
  shown: string
): string => {
  if (isLocked) {
    return `${levelLabel(level)} runs always use ${shortModel(shown)}. Pick another level in the Level menu to change the model.`;
  }

  return "Saved for this project.";
};

const ModelGroup = ({
  shown,
  level,
  isLocked,
  onModel,
}: {
  shown: string;
  level: RunLevel;
  isLocked: boolean;
  onModel: (id: string) => void;
}): ReactElement => (
  <section className="rs-group">
    <h3 className="rs-label">{copy.model}</h3>
    <ModelToggle value={shown} onChange={onModel} locked={isLocked} />
    <p className="rs-hint">{toModelHint(isLocked, level, shown)}</p>
  </section>
);

export { ModelGroup };
