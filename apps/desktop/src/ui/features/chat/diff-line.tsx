import type { ReactElement } from "react";

import type { DiffRow } from "./diff-rows-model.js";

const DiffLine = ({ row }: { row: DiffRow }): ReactElement => (
  <div className={`diff-line ${row.kind}`} data-kind={row.kind}>
    <span className="diff-no" aria-hidden="true">
      {row.oldNo}
    </span>
    <span className="diff-no" aria-hidden="true">
      {row.newNo}
    </span>
    <span className="diff-sign" aria-hidden="true">
      {row.sign}
    </span>
    <span className="diff-text">
      {row.reader && <span className="sr-only">{row.reader}</span>}
      {row.text}
    </span>
  </div>
);

export { DiffLine };
