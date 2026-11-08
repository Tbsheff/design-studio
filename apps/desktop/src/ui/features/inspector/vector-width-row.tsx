import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { useVectorWidth } from "./use-vector-width.js";

const VectorWidthRow = ({
  value,
  isDisabled,
  onSave,
}: {
  readonly value: string;
  readonly isDisabled: boolean;
  readonly onSave: (value: number | null) => void;
}): ReactElement => {
  const width = useVectorWidth(value, onSave);

  return (
    <div className="ins-field">
      <label htmlFor="vector-stroke-width" className="ins-scrub static">
        {copy.weight}
      </label>
      <input
        id="vector-stroke-width"
        className="ins-input"
        aria-label={copy.strokeWidth}
        inputMode="decimal"
        value={width.shown}
        placeholder="0"
        disabled={isDisabled}
        onChange={width.handleChange}
        onKeyDown={width.handleKeyDown}
        onBlur={width.handleBlur}
      />
    </div>
  );
};

export { VectorWidthRow };
