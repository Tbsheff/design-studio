import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { EffectKind, ShadowSize } from "./deps.js";
import type { ShadowSizePick } from "./effect-model.js";
import { EffectStepButton } from "./effect-step-button.js";
import { ShadowSizeSelect } from "./shadow-size-select.js";

import styles from "./effect.module.css";

interface EffectRowHeadProps {
  readonly disabled: boolean;
  readonly isEnabled: boolean;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  readonly kind: EffectKind;
  readonly onDown: () => void;
  readonly onRemove: () => void;
  readonly onSize: (pick: ShadowSizePick) => void;
  readonly onToggle: () => void;
  readonly onUp: () => void;
  readonly size: ShadowSize | null;
  readonly sizes: readonly ShadowSize[];
}

const EffectRowHead = ({
  disabled,
  isEnabled,
  isFirst,
  isLast,
  kind,
  onDown,
  onRemove,
  onSize,
  onToggle,
  onUp,
  size,
  sizes,
}: EffectRowHeadProps): ReactElement => (
  <div className={styles.head} data-sized={sizes.length > 0}>
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
    {sizes.length > 0 && (
      <ShadowSizeSelect
        disabled={disabled}
        sizes={sizes}
        value={size}
        onPick={onSize}
      />
    )}
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
