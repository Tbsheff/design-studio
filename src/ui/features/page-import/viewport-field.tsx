import { useId } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { VIEWPORT_PRESETS } from "./page-import-model.js";
import type { PageImportState } from "./use-page-import.js";
import { ViewportOption } from "./viewport-option.js";

import styles from "./page-import.module.css";

interface ViewportFieldProps {
  readonly state: PageImportState;
}

const ViewportField = ({ state }: ViewportFieldProps): ReactElement => {
  const name = useId();
  const { setWidth: handlePick } = state;

  return (
    <fieldset className={styles.presets}>
      <legend className={styles.label}>{copy.viewport}</legend>
      {VIEWPORT_PRESETS.map((preset) => (
        <ViewportOption
          key={preset.id}
          disabled={state.isPending}
          isChecked={preset.width === state.width}
          name={name}
          preset={preset}
          onPick={handlePick}
        />
      ))}
    </fieldset>
  );
};

export { ViewportField };
