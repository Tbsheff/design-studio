import type { ReactElement } from "react";

import { EffectStylePicker } from "./effect-style-picker.js";
import { EffectStyleSave } from "./effect-style-save.js";
import type { EffectStyle } from "./effect-types.js";

import styles from "./effect.module.css";

interface EffectStyleBarProps {
  readonly canSave: boolean;
  readonly disabled: boolean;
  readonly styleName: string | null;
  readonly styles: readonly EffectStyle[];
  readonly onPick: (name: string | null) => void;
  readonly onSave: (name: string) => void;
}

const EffectStyleBar = ({
  canSave,
  disabled,
  styleName,
  styles: saved,
  onPick,
  onSave,
}: EffectStyleBarProps): ReactElement => (
  <div className={styles.styleBar}>
    <EffectStylePicker
      disabled={disabled}
      styleName={styleName}
      styles={saved}
      onPick={onPick}
    />
    <EffectStyleSave canSave={canSave} disabled={disabled} onSave={onSave} />
  </div>
);

export { EffectStyleBar };

export type { EffectStyleBarProps };
