import type { MutableRefObject, ReactElement } from "react";

import { copy } from "./copy.js";
import type { PreviewPort, SaveStatus, SelectionContext } from "./deps.js";
import { StateChip } from "./state-chip.js";
import { StateNote } from "./state-note.js";
import { CHIPS, hasDot } from "./state-styles-model.js";
import type { ChipId } from "./state-styles-model.js";
import { useStateStyles } from "./use-state-styles.js";

import styles from "./state-styles.module.css";

interface StateChipRowProps {
  readonly directionId: string;
  readonly port: MutableRefObject<PreviewPort | null>;
  readonly projectId: string;
  readonly status: SaveStatus;
  readonly target: SelectionContext;
}

const noteOf = (
  active: ChipId | null,
  isOff: boolean,
  reason: string | null
): string | null => {
  if (isOff) {
    return reason;
  }

  if (active !== "default" && active !== null) {
    return copy.stateNote;
  }

  return null;
};

const StateChipRow = (props: StateChipRowProps): ReactElement => {
  const state = useStateStyles(props);

  return (
    <fieldset aria-label={copy.groupLabel} className={styles.row}>
      <div className={styles.chips}>
        {CHIPS.map((chip) => (
          <StateChip
            chip={chip}
            hasStyles={hasDot(chip, state.styled)}
            isDisabled={state.isOff && chip !== "default"}
            isOn={state.active === chip}
            key={chip}
            onPick={state.handlePick}
          />
        ))}
      </div>
      <StateNote
        isError={false}
        text={noteOf(state.active, state.isOff, state.reason)}
      />
      <StateNote isError text={state.error} />
    </fieldset>
  );
};

export { StateChipRow };

export type { StateChipRowProps };
