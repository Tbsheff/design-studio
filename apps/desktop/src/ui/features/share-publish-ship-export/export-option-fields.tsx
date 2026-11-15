import type { ReactElement } from "react";

import { ExportFlowFields } from "./export-flow-fields.js";
import { ExportFrameList } from "./export-frame-list.js";
import { ExportScaleField } from "./export-scale-field.js";
import { ExportScopeField } from "./export-scope-field.js";
import { ExportSelectionField } from "./export-selection-field.js";
import type { FrameLabel } from "./frame-label.js";
import type { ExportOptions } from "./use-export-options.js";

interface ExportOptionFieldsProps {
  readonly options: ExportOptions;
  readonly labels: ReadonlyMap<string, FrameLabel>;
}

const ExportOptionFields = ({
  labels,
  options,
}: ExportOptionFieldsProps): ReactElement => {
  const {
    chosen,
    flow,
    format,
    isSelectionOnly,
    onChooseScale,
    onChooseScope,
    onToggle,
    scale,
    scope,
  } = options;

  const hasScope =
    ((format === "png" || format === "svg") && !isSelectionOnly) ||
    format === "pdf";

  return (
    <>
      {isSelectionOnly && <ExportSelectionField />}
      {options.needsFrames && (
        <ExportFrameList
          options={options}
          labels={labels}
          onToggle={onToggle}
        />
      )}
      {format === "png" && (
        <ExportScaleField
          scale={scale}
          chosen={chosen}
          isSelectionOnly={isSelectionOnly}
          onChange={onChooseScale}
        />
      )}
      {format === "flow" && <ExportFlowFields flow={flow} />}
      {hasScope && <ExportScopeField scope={scope} onChange={onChooseScope} />}
    </>
  );
};

export { ExportOptionFields };
