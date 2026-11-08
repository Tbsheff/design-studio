import type { RunLevel } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { LevelControl } from "./level-control.js";
import { levelHint } from "./level-model.js";

const LevelGroup = ({
  level,
  onLevel,
}: {
  level: RunLevel;
  onLevel: (level: RunLevel) => void;
}): ReactElement => (
  <section className="rs-group">
    <h3 className="rs-label">{copy.level}</h3>
    <LevelControl value={level} onChange={onLevel} />
    <p className="rs-hint">{levelHint(level)}</p>
  </section>
);

export { LevelGroup };
