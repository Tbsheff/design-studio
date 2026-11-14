import type { MutableRefObject, ReactElement } from "react";

import { copy } from "./copy.js";
import type { PreviewPort, SaveStatus, SelectionContext } from "./deps.js";
import { StateChip } from "./state-chip.js";
import { StateNote } from "./state-note.js";
import { hasDot, isGroupOff, toEdgeNote } from "./state-styles-model.js";
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
  reason: string | null,
  edgeNote: string | null
): string | null => {
  if (isOff) {
    return reason;
  }

  if (edgeNote !== null) {
    return `${edgeNote} ${copy.stateNote}`;
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
        {state.chips.map((chip) => (
          <StateChip
            chip={chip}
            hasStyles={hasDot(chip, state.styled)}
            isDisabled={state.isOff && chip !== "default"}
            isOn={state.active === chip}
            isUnavailable={isGroupOff(chip, state.info)}
            key={chip}
            onPick={state.handlePick}
          />
        ))}
        {(state.info?.other ?? []).map((part) => (
          <span
            className={`${styles.chip} ${styles.other}`}
            data-tip={copy.otherTip}
            key={part}
          >
            {part}
          </span>
        ))}
      </div>
      <StateNote
        isError={false}
        text={noteOf(
          state.active,
          state.isOff,
          state.reason,
          toEdgeNote(state.active, state.info)
        )}
      />
      <StateNote isError text={state.error} />
    </fieldset>
  );
};

export { StateChipRow };

export type { StateChipRowProps };
