import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import type { EffectStyle } from "./effect-types.js";

import styles from "./effect.module.css";

interface EffectStylePickerProps {
  readonly disabled: boolean;
  readonly styleName: string | null;
  readonly styles: readonly EffectStyle[];
  readonly onPick: (name: string | null) => void;
}

const EffectStylePicker = ({
  disabled,
  styleName,
  styles: saved,
  onPick,
}: EffectStylePickerProps): ReactElement => {
  const handlePick = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      onPick(event.target.value || null);
    },
    [onPick]
  );

  return (
    <label className="ins-field select" data-tip={copy.styleTip}>
      <span className={styles.label}>{copy.style}</span>
      <select
        aria-label={copy.style}
        className="ins-input"
        disabled={disabled}
        value={styleName ?? ""}
        onChange={handlePick}
      >
        <option value="">{copy.styleNone}</option>
        {saved.map((entry) => (
          <option key={entry.name} value={entry.name}>
            {entry.name}
          </option>
        ))}
      </select>
    </label>
  );
};

export { EffectStylePicker };

export type { EffectStylePickerProps };
