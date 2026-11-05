import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { GridInfo } from "./deps.js";
import { GridLineField } from "./grid-line-field.js";
import type { LineKey } from "./grid-model.js";

import styles from "./grid.module.css";

interface GridItemFieldsProps {
  readonly disabled: boolean;
  readonly info: GridInfo;
  readonly onCommit: (field: LineKey, raw: string) => void;
}

const GridItemFields = ({
  disabled,
  info,
  onCommit,
}: GridItemFieldsProps): ReactElement => {
  const { column, row } = info.placement;

  return (
    <div className={styles.item}>
      <div className="ins-grid">
        <GridLineField
          disabled={disabled}
          field="colStart"
          label={copy.colStart}
          tip={copy.lineTip}
          value={column.start}
          onCommit={onCommit}
        />
        <GridLineField
          disabled={disabled}
          field="colSpan"
          label={copy.colSpan}
          tip={copy.lineTip}
          value={column.span}
          onCommit={onCommit}
        />
        <GridLineField
          disabled={disabled}
          field="rowStart"
          label={copy.rowStart}
          tip={copy.lineTip}
          value={row.start}
          onCommit={onCommit}
        />
        <GridLineField
          disabled={disabled}
          field="rowSpan"
          label={copy.rowSpan}
          tip={copy.lineTip}
          value={row.span}
          onCommit={onCommit}
        />
      </div>
    </div>
  );
};

export { GridItemFields };

export type { GridItemFieldsProps };
