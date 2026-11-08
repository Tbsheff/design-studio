import { useCallback } from "react";
import type { ReactElement } from "react";

import type { ViewportPreset } from "../../domain/canvas-presets.js";
import { uiStore } from "../../platform/storage.js";
import { ViewportRadio } from "./viewport-radio.js";

interface PresetRadioProps {
  readonly isOn: boolean;
  readonly preset: ViewportPreset;
}

const toPresetAlign = (preset: ViewportPreset): "start" | null => {
  if (preset.id === "desktop") {
    return "start";
  }

  return null;
};

const PresetRadio = ({ isOn, preset }: PresetRadioProps): ReactElement => {
  const onSelect = useCallback((): void => {
    uiStore.set({
      viewport: {
        height: preset.height,
        preset: preset.id,
        width: preset.width,
      },
    });
  }, [preset]);

  return (
    <ViewportRadio
      icon={preset.icon}
      isOn={isOn}
      label={preset.label}
      name="viewport-preset"
      onSelect={onSelect}
      tip={preset.label}
      tipAlign={toPresetAlign(preset)}
    />
  );
};

export { PresetRadio };
