import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { IconOption } from "./icon-option.js";
import type { Picker } from "./use-picker.js";

import styles from "./icons.module.css";

interface IconGridProps {
  readonly gridId: string;
  readonly picker: Picker;
}

const IconGrid = ({ gridId, picker }: IconGridProps): ReactElement => {
  const { state } = picker;

  if (state.status === "loading") {
    return <p className={styles.note}>{copy.loading}</p>;
  }

  if (state.status === "error") {
    return (
      <p className="alert error small" role="alert">
        {state.message || copy.failed}
      </p>
    );
  }

  if (picker.icons.length === 0) {
    return <p className={styles.note}>{copy.empty}</p>;
  }

  return (
    <fieldset className={styles.grid} id={gridId}>
      <legend className="sr-only">{copy.grid}</legend>
      {picker.icons.map((icon, index) => (
        <IconOption
          checked={index === picker.active}
          icon={icon}
          index={index}
          key={`${icon.library}:${icon.name}`}
          onPick={picker.handlePick}
        />
      ))}
    </fieldset>
  );
};

export { IconGrid };
