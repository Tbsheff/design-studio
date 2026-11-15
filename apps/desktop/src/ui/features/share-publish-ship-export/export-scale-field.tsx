import { EXPORT_SCALES } from "@design-studio/contracts/export";
import type { ExportFrame, ExportScale } from "@design-studio/contracts/export";
import type { ReactElement } from "react";

import { copy as uiCopy } from "./copy.js";
import { isScaleOff } from "./export-scale-model.js";
import { moveRadioFocus } from "./radio-keys.js";
import { SegmentButton } from "./segment-button.js";

interface ExportScaleFieldProps {
  readonly scale: ExportScale;
  readonly chosen: readonly ExportFrame[];
  readonly isSelectionOnly: boolean;
  readonly onChange: (scale: ExportScale) => void;
}

const toOffTip = (
  scale: ExportScale,
  chosen: readonly ExportFrame[],
  isSelectionOnly: boolean
): string | null => {
  if (isSelectionOnly || !isScaleOff(scale, chosen)) {
    return null;
  }

  return uiCopy.scaleTooTall;
};

const ExportScaleField = ({
  chosen,
  isSelectionOnly,
  onChange,
  scale,
}: ExportScaleFieldProps): ReactElement => {
  const first = chosen[0] ?? null;

  return (
    <div className="export-field export-inline">
      <span className="export-label">{uiCopy.scale}</span>
      <div
        className="segmented export-seg"
        role="radiogroup"
        tabIndex={-1}
        aria-label={uiCopy.scaleLabel}
        onKeyDown={moveRadioFocus}
      >
        {EXPORT_SCALES.map((each) => (
          <SegmentButton
            key={each}
            id={each}
            label={`${each}×`}
            icon={null}
            isOn={scale === each}
            offTip={toOffTip(each, chosen, isSelectionOnly)}
            onChange={onChange}
          />
        ))}
      </div>
      {first && !isSelectionOnly && (
        <span className="export-sub export-size">
          {`${first.width * scale} ${uiCopy.pxWide}`}
        </span>
      )}
    </div>
  );
};

export { ExportScaleField };
