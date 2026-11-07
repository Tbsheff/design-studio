import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { SHADER_PRESETS } from "./deps.js";
import type { ShaderPreset } from "./deps.js";

import styles from "./effect.module.css";

interface EffectPresetSelectProps {
  readonly disabled: boolean;
  readonly value: ShaderPreset;
  readonly onPick: (preset: ShaderPreset) => void;
}

const EffectPresetSelect = ({
  disabled,
  value,
  onPick,
}: EffectPresetSelectProps): ReactElement => {
  const handlePick = useCallback(
    (event: ChangeEvent<HTMLSelectElement>): void => {
      const picked = SHADER_PRESETS.find(
        (preset) => preset === event.target.value
      );

      if (picked) {
        onPick(picked);
      }
    },
    [onPick]
  );

  return (
    <label className="ins-field select">
      <span className={styles.label}>{copy.preset}</span>
      <select
        aria-label={copy.preset}
        className="ins-input"
        disabled={disabled}
        value={value}
        onChange={handlePick}
      >
        {SHADER_PRESETS.map((preset) => (
          <option key={preset} value={preset}>
            {copy.presetLabel[preset]}
          </option>
        ))}
      </select>
    </label>
  );
};

export { EffectPresetSelect };
