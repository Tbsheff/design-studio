import type { ReactElement } from "react";

import { dataFill } from "./copy.js";
import type { DataFillPreview } from "./data-fill-model.js";
import { PreviewRow } from "./preview-row.js";

import styles from "./content.module.css";

interface PreviewTableProps {
  readonly preview: DataFillPreview;
}

const PreviewTable = ({ preview }: PreviewTableProps): ReactElement => (
  <table aria-label={dataFill.previewLabel} className={styles.preview}>
    <thead>
      <PreviewRow kind="head" row={preview.head} />
    </thead>
    <tbody>
      {preview.rows.map((row) => (
        <PreviewRow key={row.id} kind="body" row={row} />
      ))}
    </tbody>
  </table>
);

export { PreviewTable };
