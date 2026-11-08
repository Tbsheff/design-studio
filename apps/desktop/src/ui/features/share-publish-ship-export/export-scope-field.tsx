import type { ExportScope } from "@design-studio/contracts/export";
import type { ReactElement } from "react";

import { copy as uiCopy } from "./copy.js";
import { Segmented } from "./segmented.js";
import type { SegmentOption } from "./segmented.js";

interface ExportScopeFieldProps {
  readonly scope: ExportScope;
  readonly onChange: (scope: ExportScope) => void;
}

const SCOPE_OPTIONS: readonly SegmentOption<ExportScope>[] = [
  { icon: null, id: "page", label: uiCopy.fullPage },
  { icon: null, id: "frame", label: uiCopy.frameOnly },
];

const ExportScopeField = ({
  onChange,
  scope,
}: ExportScopeFieldProps): ReactElement => (
  <div className="export-field export-inline">
    <span className="export-label">{uiCopy.area}</span>
    <Segmented
      label={uiCopy.areaLabel}
      value={scope}
      options={SCOPE_OPTIONS}
      onChange={onChange}
    />
  </div>
);

export { ExportScopeField };
