import type { ReactElement } from "react";

import { toWireRows } from "./block-model.js";
import type { BlockKind, WireCell } from "./block-model.js";

import styles from "./block.module.css";

interface BlockWireframeProps {
  readonly kind: BlockKind;
}

const CELL_CLASS: Readonly<Record<WireCell, string>> = {
  box: styles.wireBox ?? "",
  button: styles.wireButton ?? "",
  chip: styles.wireChip ?? "",
  line: styles.wireLine ?? "",
  short: styles.wireShort ?? "",
};

const BlockWireframe = ({ kind }: BlockWireframeProps): ReactElement => (
  <div aria-hidden="true" className={styles.wire}>
    {toWireRows(kind).map((row) => (
      <div className={styles.wireRow} key={row.id}>
        {row.cells.map((item) => (
          <span className={CELL_CLASS[item.cell]} key={item.id} />
        ))}
      </div>
    ))}
  </div>
);

export { BlockWireframe };
