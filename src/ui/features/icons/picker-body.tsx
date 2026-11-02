import type { ReactElement } from "react";

import { ColorField } from "./color-field.js";
import { IconGrid } from "./icon-grid.js";
import { SearchField } from "./search-field.js";
import { SizeField } from "./size-field.js";
import type { Picker } from "./use-picker.js";

import styles from "./icons.module.css";

interface PickerBodyProps {
  readonly gridId: string;
  readonly hintId: string;
  readonly picker: Picker;
}

const PickerBody = ({
  gridId,
  hintId,
  picker,
}: PickerBodyProps): ReactElement => (
  <div className={`modal-body ${styles.body}`}>
    <SearchField gridId={gridId} hintId={hintId} picker={picker} />
    <IconGrid gridId={gridId} picker={picker} />
    <div className={styles.look}>
      <SizeField picker={picker} />
      <ColorField picker={picker} />
    </div>
    {picker.insert.failure && (
      <p className="alert error small" role="alert">
        {picker.insert.failure}
      </p>
    )}
  </div>
);

export { PickerBody };
