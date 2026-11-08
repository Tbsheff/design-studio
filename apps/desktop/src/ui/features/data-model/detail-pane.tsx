import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toFieldTable, toRowsTable } from "./data-model-model.js";
import type { DataModelDetail, DataModelVariant } from "./data-model-model.js";
import { DataTable } from "./data-table.js";
import { VariantChips } from "./variant-chips.js";

import styles from "./data-model.module.css";

const FIELD_COLUMNS = [
  copy.fieldCol,
  copy.typeCol,
  copy.flagCol,
  copy.valueCol,
] as const;

interface DetailPaneProps {
  readonly detail: DataModelDetail;
  readonly onVariant: (variant: DataModelVariant) => void;
  readonly variant: DataModelVariant;
}

const DetailPane = ({
  detail,
  onVariant,
  variant,
}: DetailPaneProps): ReactElement => (
  <div className={styles.detail}>
    <header className={styles.detailHead}>
      <h3 className={styles.detailName}>{detail.name}</h3>
      <span
        className={styles.note}
      >{`${detail.file}:${String(detail.line)}`}</span>
      <VariantChips onPick={onVariant} variant={variant} />
    </header>
    <DataTable
      label={copy.fieldsLabel}
      table={toFieldTable(detail, FIELD_COLUMNS)}
    />
    <DataTable label={copy.rowsLabel} table={toRowsTable(detail)} />
  </div>
);

export { DetailPane };
