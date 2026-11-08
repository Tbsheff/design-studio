import { REQUIRED_TOKENS } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { PvColor } from "./pv-color.js";

const PvPalette = (): ReactElement => (
  <ul className="pv-palette" aria-label={COPY.labelColors}>
    {REQUIRED_TOKENS.color.map((name) => (
      <PvColor key={name} name={name} />
    ))}
  </ul>
);

export { PvPalette };
