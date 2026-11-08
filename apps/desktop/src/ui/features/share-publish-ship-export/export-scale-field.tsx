import { EXPORT_SCALES } from "@design-studio/contracts/export";
import type { ExportFrame, ExportScale } from "@design-studio/contracts/export";
import type { ReactElement } from "react";

import { copy as uiCopy } from "./copy.js";
import { Segmented } from "./segmented.js";
import type { SegmentOption } from "./segmented.js";

interface ExportScaleFieldProps {
  readonly scale: ExportScale;
  readonly first: ExportFrame | null;
  readonly isSelectionOnly: boolean;
  readonly onChange: (scale: ExportScale) => void;
}

const SCALE_OPTIONS: readonly SegmentOption<ExportScale>[] = EXPORT_SCALES.map(
  (scale) => ({ icon: null, id: scale, label: `${scale}×` })
);

const ExportScaleField = ({
  first,
  isSelectionOnly,
  onChange,
  scale,
}: ExportScaleFieldProps): ReactElement => (
  <div className="export-field export-inline">
    <span className="export-label">{uiCopy.scale}</span>
    <Segmented
      label={uiCopy.scaleLabel}
      value={scale}
      options={SCALE_OPTIONS}
      onChange={onChange}
    />
    {first && !isSelectionOnly && (
      <span className="export-sub export-size">
        {`${first.width * scale} ${uiCopy.pxWide}`}
      </span>
    )}
  </div>
);

export { ExportScaleField };
