import type { MutableRefObject, ReactElement } from "react";

import { copy } from "./copy.js";
import { DarkToggle } from "./dark-toggle.js";
import type { PreviewPort, SaveStatus, SelectionContext } from "./deps.js";
import { StateMenu } from "./state-menu.js";
import { StateNote } from "./state-note.js";
import { hasDot, toEdgeNote } from "./state-styles-model.js";
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
  isOff: boolean,
  reason: string | null,
  edgeNote: string | null
): string | null => {
  if (isOff) {
    return reason;
  }

  return edgeNote;
};

const StateChipRow = (props: StateChipRowProps): ReactElement => {
  const state = useStateStyles(props);

  return (
    <span className={styles.row}>
      <StateMenu state={state} />
      <DarkToggle
        hasStyles={hasDot("dark", state.styled)}
        isDisabled={state.isOff}
        isOn={state.active === "dark"}
        onToggle={state.handleDark}
      />
      {(state.info?.other ?? []).map((part) => (
        <span
          className={`${styles.chip} ${styles.other}`}
          data-tip={copy.otherTip}
          key={part}
        >
          {part}
        </span>
      ))}
      <StateNote
        isError={false}
        text={noteOf(
          state.isOff,
          state.reason,
          toEdgeNote(state.active, state.info)
        )}
      />
      <StateNote isError text={state.error} />
    </span>
  );
};

export { StateChipRow };

export type { StateChipRowProps };
