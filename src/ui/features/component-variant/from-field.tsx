import { useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { UiSelect } from "./deps.js";
import type { VariantGroup } from "./deps.js";
import type { SheetMode } from "./variant-model.js";

import styles from "./component-variant.module.css";

interface FromFieldProps {
  readonly disabled: boolean;
  readonly group: VariantGroup;
  readonly mode: SheetMode;
  readonly onChange: (value: string) => void;
  readonly value: string;
}

const FromField = (props: FromFieldProps): ReactElement => {
  const { group } = props;
  let label: string = copy.startFrom;

  if (props.mode === "edit") {
    label = copy.value;
  }

  const options = useMemo(
    () =>
      group.options.map((entry) => ({
        label: entry.value,
        value: entry.value,
      })),
    [group.options]
  );

  return (
    <div className={styles.field}>
      <span className={styles.label}>{label}</span>
      <UiSelect
        aria-label={label}
        disabled={props.disabled}
        options={options}
        value={props.value}
        onChange={props.onChange}
      />
    </div>
  );
};

export { FromField };
