import { useCallback } from "react";
import type { MouseEvent, ReactElement } from "react";

import { layoutGridCopy } from "./copy.js";
import type { LayoutGridPresetId } from "./layout-grid-model.js";

interface LayoutGridPresetsProps {
  readonly onPick: (preset: LayoutGridPresetId) => void;
}

const PRESETS: readonly {
  readonly id: LayoutGridPresetId;
  readonly label: string;
}[] = [
  { id: "columns-12", label: layoutGridCopy.columns12 },
  { id: "columns-4", label: layoutGridCopy.columns4 },
  { id: "rows-8", label: layoutGridCopy.rows8 },
];

const isPreset = (value: string | undefined): value is LayoutGridPresetId =>
  PRESETS.some((preset) => preset.id === value);

const LayoutGridPresets = ({
  onPick,
}: LayoutGridPresetsProps): ReactElement => {
  const pickPreset = useCallback(
    (event: MouseEvent<HTMLButtonElement>): void => {
      const { preset } = event.currentTarget.dataset;

      if (isPreset(preset)) {
        onPick(preset);
      }
    },
    [onPick]
  );

  return (
    <div className="layout-grid-presets">
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          className="btn ghost sm"
          data-preset={preset.id}
          onClick={pickPreset}
        >
          {preset.label}
        </button>
      ))}
    </div>
  );
};

export { LayoutGridPresets };
