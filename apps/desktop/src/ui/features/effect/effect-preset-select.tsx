import { UiSelect } from "@design-studio/ui";
import type { UiSelectOption } from "@design-studio/ui";
import { useId } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { SHADER_PRESETS } from "./deps.js";
import type { ShaderPreset } from "./deps.js";

import styles from "./effect.module.css";

interface EffectPresetSelectProps {
  readonly disabled: boolean;
  readonly value: ShaderPreset;
  readonly onPick: (preset: ShaderPreset) => void;
}

const PRESET_OPTIONS: readonly UiSelectOption<ShaderPreset>[] =
  SHADER_PRESETS.map((preset) => ({
    label: copy.presetLabel[preset],
    value: preset,
  }));

const EffectPresetSelect = ({
  disabled,
  value,
  onPick,
}: EffectPresetSelectProps): ReactElement => {
  const presetId = useId();

  return (
    <div className="ins-field select">
      <label className={styles.label} htmlFor={presetId}>
        {copy.preset}
      </label>
      <UiSelect
        aria-label={copy.preset}
        disabled={disabled}
        id={presetId}
        options={PRESET_OPTIONS}
        value={value}
        onChange={onPick}
      />
    </div>
  );
};

export { EffectPresetSelect };
