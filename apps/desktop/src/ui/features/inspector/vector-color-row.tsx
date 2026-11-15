import type { ReactElement } from "react";

import { ColorSwatch } from "./color-swatch.js";
import { useVectorColor } from "./use-vector-color.js";
import { toPaintSwatch } from "./vector-model.js";

const VectorColorRow = ({
  label,
  value,
  isDisabled,
  onSave,
}: {
  readonly label: string;
  readonly value: string;
  readonly isDisabled: boolean;
  readonly onSave: (value: string | null) => void;
}): ReactElement => {
  const color = useVectorColor(value, onSave);
  const id = `vector-${label.toLowerCase()}`;

  return (
    <div className="ins-field color">
      <label htmlFor={id} className="ins-scrub static">
        {label}
      </label>
      <input
        id={id}
        className="ins-input"
        aria-label={label}
        aria-invalid={color.isInvalid}
        value={color.shown}
        spellCheck={false}
        autoComplete="off"
        disabled={isDisabled}
        onChange={color.handleChange}
        onKeyDown={color.handleKeyDown}
        onBlur={color.handleBlur}
      />
      <ColorSwatch
        label={label}
        shown={toPaintSwatch(value)}
        isDisabled={isDisabled}
        target={color.target}
      />
    </div>
  );
};

export { VectorColorRow };
