import { useMemo } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { useVectorColor } from "./use-vector-color.js";
import { toSwatchClass, toSwatchStyle } from "./vector-model.js";

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
  const swatchStyle = useMemo(() => toSwatchStyle(value), [value]);

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
      <span className={toSwatchClass(value)} style={swatchStyle}>
        <input
          type="color"
          aria-label={`${label}${copy.swatchSuffix}`}
          value={color.hex}
          disabled={isDisabled}
          onChange={color.handleSwatch}
        />
      </span>
    </div>
  );
};

export { VectorColorRow };
