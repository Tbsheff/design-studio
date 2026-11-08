import type {
  StyleKind,
  StyleValueRow,
} from "@design-studio/contracts/style-search";
import type { ReactElement } from "react";
import { useCallback, useState } from "react";

import { toMoreLabel, toShownRows } from "./match-rows-model.js";
import type { RowActions } from "./match-rows-model.js";
import { KIND_LABEL, ROWS_SHOWN, toRowKey } from "./match-scan-model.js";
import { ValueRow } from "./match-value-row.js";

const KindGroup = ({
  kind,
  rows,
  actions,
  replaceLabel,
}: {
  readonly kind: StyleKind;
  readonly rows: StyleValueRow[];
  readonly actions: RowActions;
  readonly replaceLabel: string;
}): ReactElement | null => {
  const [isAll, setIsAll] = useState(false);
  const toggleAll = useCallback(() => setIsAll((current) => !current), []);

  if (rows.length === 0) {
    return null;
  }

  return (
    <div className="sm-group">
      <h4 className="sm-group-head">{KIND_LABEL[kind]}</h4>
      <ul className="sm-list">
        {toShownRows(rows, isAll).map((row) => (
          <ValueRow
            key={toRowKey(row)}
            row={row}
            actions={actions}
            replaceLabel={replaceLabel}
          />
        ))}
      </ul>
      {rows.length > ROWS_SHOWN && (
        <button
          type="button"
          className="tk-lint-more"
          aria-expanded={isAll}
          onClick={toggleAll}
        >
          {toMoreLabel(isAll, rows.length)}
        </button>
      )}
    </div>
  );
};

export { KindGroup };
