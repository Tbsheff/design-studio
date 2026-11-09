import type { SelectionContext } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import type { DirectEdit } from "./deps.js";
import type { ElementClasses } from "./element-classes-model.js";
import { MAX_LINES, MIN_LINES } from "./truncate-model.js";
import { TruncateToggle } from "./truncate-toggle.js";
import { useTruncate } from "./use-truncate.js";

interface TruncateRowProps {
  readonly edit: DirectEdit;
  readonly selection: SelectionContext;
  readonly classes: ElementClasses;
}

const TruncateRow = ({
  edit,
  selection,
  classes,
}: TruncateRowProps): ReactElement => {
  const { error, isReady, onLines, onToggle, state } = useTruncate(
    edit,
    selection,
    classes
  );

  const handleLines = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const next = event.target.valueAsNumber;

      if (Number.isFinite(next)) {
        onLines(next);
      }
    },
    [onLines]
  );

  return (
    <div className="wide">
      <div className="ins-field ins-align-row">
        <span className="ins-scrub static">{copy.truncate}</span>
        <TruncateToggle
          isDisabled={!isReady}
          isOn={state.isOn}
          onToggle={onToggle}
        />
        <input
          className="ins-input"
          type="number"
          aria-label={copy.truncateMaxLines}
          data-tip={copy.truncateMaxLines}
          min={MIN_LINES}
          max={MAX_LINES}
          step={1}
          value={state.lines}
          disabled={!isReady || !state.isOn}
          onChange={handleLines}
        />
      </div>
      {error && (
        <p className="ins-note" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};

export { TruncateRow };
