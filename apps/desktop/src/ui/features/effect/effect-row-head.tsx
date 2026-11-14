import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { EffectKind } from "./deps.js";
import { EffectStepButton } from "./effect-step-button.js";

import styles from "./effect.module.css";

interface EffectRowHeadProps {
  readonly disabled: boolean;
  readonly isEnabled: boolean;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  readonly kind: EffectKind;
  readonly onDown: () => void;
  readonly onRemove: () => void;
  readonly onToggle: () => void;
  readonly onUp: () => void;
}

const EffectRowHead = ({
  disabled,
  isEnabled,
  isFirst,
  isLast,
  kind,
  onDown,
  onRemove,
  onToggle,
  onUp,
}: EffectRowHeadProps): ReactElement => (
  <div className={styles.head}>
    <input
      aria-label={copy.toggle}
      checked={isEnabled}
      className={styles.toggle}
      data-tip={copy.toggle}
      disabled={disabled}
      type="checkbox"
      onChange={onToggle}
    />
    <span className={styles.kind}>{copy.kind[kind]}</span>
    <EffectStepButton
      disabled={disabled || isFirst}
      icon="arrowUp"
      label={copy.moveUp}
      onPress={onUp}
    />
    <EffectStepButton
      disabled={disabled || isLast}
      icon="arrowDown"
      label={copy.moveDown}
      onPress={onDown}
    />
    <EffectStepButton
      disabled={disabled}
      icon="close"
      label={copy.remove}
      onPress={onRemove}
    />
  </div>
);

export { EffectRowHead };

export type { EffectRowHeadProps };
