import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { FILL_TYPES } from "./deps.js";
import type { FillType } from "./deps.js";
import { TypeTab } from "./type-tab.js";

import styles from "./fill.module.css";

interface TypeTabsProps {
  readonly disabled: boolean;
  readonly value: FillType;
  readonly onPick: (type: FillType) => void;
}

const TypeTabs = ({ disabled, value, onPick }: TypeTabsProps): ReactElement => (
  <fieldset className={styles.tabs}>
    <legend className={styles.legend}>{copy.typeLabel}</legend>
    {FILL_TYPES.map((type) => (
      <TypeTab
        checked={type === value}
        disabled={disabled}
        key={type}
        type={type}
        onPick={onPick}
      />
    ))}
  </fieldset>
);

export { TypeTabs };
