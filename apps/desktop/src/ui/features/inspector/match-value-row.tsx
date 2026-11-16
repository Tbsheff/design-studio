import type { StyleValueRow } from "@design-studio/contracts/style-search";
import type { ReactElement } from "react";

import { toShownValue } from "./match-candidates-model.js";
import { RowMenu } from "./match-row-menu.js";
import { toCountTip } from "./match-rows-model.js";
import type { RowActions } from "./match-rows-model.js";
import { toRowKey } from "./match-scan-model.js";
import { StateTag } from "./match-state-tag.js";
import { Swatch } from "./match-swatch.js";

const ValueRow = ({
  row,
  actions,
  replaceLabel,
}: {
  readonly row: StyleValueRow;
  readonly actions: RowActions;
  readonly replaceLabel: string;
}): ReactElement => (
  <li className="sm-row" data-testid="style-value" data-row={toRowKey(row)}>
    <Swatch kind={row.kind} value={row.value} />
    <span className="sm-value">{toShownValue(row)}</span>
    <StateTag row={row} />
    <span className="sm-count" data-tip={toCountTip(row.count)}>
      {row.count}
    </span>
    <RowMenu row={row} actions={actions} replaceLabel={replaceLabel} />
  </li>
);

export { ValueRow };
