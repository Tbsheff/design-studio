import type { ReactNode } from "react";

import { toLineClass, toSign } from "./compare-code-model.js";
import type { DiffLine } from "./compare-code-model.js";

const ROW_ROLE = "row";

interface DiffRowProps {
  readonly line: DiffLine;
}

const DiffRow = ({ line }: DiffRowProps): ReactNode => (
  <div className={toLineClass(line.kind)} role={ROW_ROLE}>
    <span className="diff-no">{line.oldNo ?? ""}</span>
    <span className="diff-no">{line.newNo ?? ""}</span>
    <span className="diff-sign">{toSign(line.kind)}</span>
    <span className="diff-text">{line.text}</span>
  </div>
);

export { DiffRow };
