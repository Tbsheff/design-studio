import type { ReactElement } from "react";

import { copy } from "./copy.js";

const ToolsHead = ({
  hasErrorColumn,
}: {
  hasErrorColumn: boolean;
}): ReactElement => (
  <thead>
    <tr>
      <th>{copy.tool}</th>
      <th>{copy.input}</th>
      <th className="num">{copy.time}</th>
      {hasErrorColumn && <th aria-label={copy.errorColumn} />}
    </tr>
  </thead>
);

export { ToolsHead };
