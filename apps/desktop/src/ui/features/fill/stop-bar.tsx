import { useCallback, useMemo } from "react";
import type { MouseEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { addStop, barCss, canAdd, positionAt } from "./fill-model.js";
import type { FillDraft } from "./fill-model.js";
import { StopHandle } from "./stop-handle.js";

import styles from "./fill.module.css";

interface StopBarProps {
  readonly disabled: boolean;
  readonly draft: FillDraft;
  readonly onDraft: (next: FillDraft) => void;
}

const StopBar = ({ disabled, draft, onDraft }: StopBarProps): ReactElement => {
  const handleAdd = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      const rect = event.currentTarget.getBoundingClientRect();
      const position = positionAt(event.clientX, rect);

      onDraft(addStop(draft, position));
    },
    [draft, onDraft]
  );

  const track = useMemo(
    () => ({ backgroundImage: barCss(draft.stops) }),
    [draft.stops]
  );

  return (
    <fieldset className={styles.bar}>
      <legend className={styles.legend}>{copy.barLabel}</legend>
      <button
        aria-label={copy.addLabel}
        className={styles.track}
        disabled={disabled || !canAdd(draft)}
        style={track}
        type="button"
        onClick={handleAdd}
      />
      {draft.stops.map((stop, index) => (
        <StopHandle
          disabled={disabled}
          draft={draft}
          index={index}
          key={stop.id}
          stop={stop}
          onDraft={onDraft}
        />
      ))}
    </fieldset>
  );
};

export { StopBar };
