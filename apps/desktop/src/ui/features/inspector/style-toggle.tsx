import { useCallback } from "react";
import type { ReactElement } from "react";

import { toOnClass } from "./rows-model.js";
import { StyleGlyph } from "./style-glyph.js";

interface StyleToggleProps {
  readonly glyph: "italic" | "strike" | "underline";
  readonly isOn: boolean;
  readonly label: string;
  readonly onRun: () => void;
}

const StyleToggle = ({
  glyph,
  isOn,
  label,
  onRun,
}: StyleToggleProps): ReactElement => {
  const handleToggle = useCallback(() => onRun(), [onRun]);

  return (
    <button
      type="button"
      className={toOnClass(isOn)}
      aria-label={label}
      aria-pressed={isOn}
      data-tip={label}
      onClick={handleToggle}
    >
      <StyleGlyph kind={glyph} />
    </button>
  );
};

export { StyleToggle };
