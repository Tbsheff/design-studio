import type { ReactElement } from "react";

import { toDiffLineClass } from "./ship-diff-model.js";

interface ShipDiffLineProps {
  readonly line: string;
}

const NEWLINE = "\n";

const ShipDiffLine = ({ line }: ShipDiffLineProps): ReactElement => (
  <span className={toDiffLineClass(line)}>
    {line || " "}
    {NEWLINE}
  </span>
);

export { ShipDiffLine };
