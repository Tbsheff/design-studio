import { useCallback } from "react";
import type { ReactElement } from "react";

import type { ShaderPreset } from "./deps.js";
import { EffectField } from "./effect-field.js";
import { toFieldViews, toToggled, toWithField } from "./effect-model.js";
import type { FieldSpec, ShadowSizes } from "./effect-model.js";
import { EffectPresetSelect } from "./effect-preset-select.js";
import { EffectRowHead } from "./effect-row-head.js";
import type { EffectItem } from "./effect-types.js";
import { ShadowSizeSelect } from "./shadow-size-select.js";
import { useRowMoves, useSizePick } from "./use-effect-handlers.js";

import styles from "./effect.module.css";

interface EffectRowProps {
  readonly disabled: boolean;
  readonly index: number;
  readonly isFirst: boolean;
  readonly isLast: boolean;
  readonly item: EffectItem;
  readonly onChange: (index: number, item: EffectItem) => void;
  readonly onMove: (index: number, step: number) => void;
  readonly onRemove: (index: number) => void;
  readonly sizes: ShadowSizes;
}

const EffectRow = ({
  disabled,
  index,
  isFirst,
  isLast,
  item,
  onChange,
  onMove,
  onRemove,
  sizes,
}: EffectRowProps): ReactElement => {
  const handleToggle = useCallback((): void => {
    onChange(index, toToggled(item));
  }, [index, item, onChange]);

  const handleField = useCallback(
    (spec: FieldSpec, value: number): void => {
      onChange(index, toWithField(item, spec, value));
    },
    [index, item, onChange]
  );

  const handlePreset = useCallback(
    (preset: ShaderPreset): void => {
      if (item.kind === "shader") {
        onChange(index, { ...item, preset });
      }
    },
    [index, item, onChange]
  );

  const { handleDown, handleRemove, handleUp } = useRowMoves(
    index,
    onMove,
    onRemove
  );

  const handleSize = useSizePick({ index, item, onChange, onRemove });

  return (
    <li className={styles.row} data-off={item.isEnabled === false}>
      <EffectRowHead
        disabled={disabled}
        isEnabled={item.isEnabled ?? true}
        isFirst={isFirst}
        isLast={isLast}
        kind={item.kind}
        onDown={handleDown}
        onRemove={handleRemove}
        onToggle={handleToggle}
        onUp={handleUp}
      />
      <div className={styles.fields}>
        <ShadowSizeSelect
          disabled={disabled}
          item={item}
          sizes={sizes}
          onPick={handleSize}
        />
        {item.kind === "shader" && (
          <EffectPresetSelect
            disabled={disabled}
            value={item.preset}
            onPick={handlePreset}
          />
        )}
        {toFieldViews(item).map((view) => (
          <EffectField
            key={view.spec.key}
            disabled={disabled}
            spec={view.spec}
            value={view.value}
            onCommit={handleField}
          />
        ))}
      </div>
    </li>
  );
};

export { EffectRow };

export type { EffectRowProps };
