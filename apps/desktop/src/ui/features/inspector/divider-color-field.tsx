import { useMemo } from "react";
import type { CSSProperties, ReactElement } from "react";

import { dividerCopy } from "./copy.js";
import { toSwatchColor } from "./divider-model.js";
import type { Divider, DividerPaint } from "./divider-model.js";
import { useDividerColorInput } from "./use-divider.js";

interface Props {
  readonly divider: Divider;
  readonly onColor: (paint: DividerPaint) => void;
}

const COLOR_ID = "ins-divider-color";

const DividerColorField = ({ divider, onColor }: Props): ReactElement => {
  const { applyColorOnBlur, applyColorOnKey } = useDividerColorInput(
    divider,
    onColor
  );

  const swatch = useMemo<CSSProperties>(
    () => ({ background: toSwatchColor(divider) }),
    [divider]
  );

  return (
    <div className="ins-field wide">
      <label htmlFor={COLOR_ID} className="ins-scrub static">
        {dividerCopy.color}
      </label>
      <input
        key={divider.color ?? ""}
        id={COLOR_ID}
        className="ins-input"
        aria-label={dividerCopy.colorLabel}
        defaultValue={divider.color ?? ""}
        placeholder={dividerCopy.colorPlaceholder}
        spellCheck={false}
        autoComplete="off"
        onKeyDown={applyColorOnKey}
        onBlur={applyColorOnBlur}
      />
      <span className="ins-swatch" style={swatch} />
    </div>
  );
};

export { DividerColorField };
