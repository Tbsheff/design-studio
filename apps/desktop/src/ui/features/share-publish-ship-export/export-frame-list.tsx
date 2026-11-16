import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import { copy as uiCopy } from "./copy.js";
import { ExportFrameRow } from "./export-frame-row.js";
import type { FrameLabel } from "./frame-label.js";
import type { ExportOptions } from "./use-export-options.js";

const EMPTY_LABEL: FrameLabel = { name: "", page: "" };

interface ExportFrameListProps {
  readonly options: ExportOptions;
  readonly labels: ReadonlyMap<string, FrameLabel>;
  readonly onToggle: (id: string) => void;
}

const ExportFrameList = ({
  labels,
  onToggle,
  options,
}: ExportFrameListProps): ReactElement => (
  <fieldset className="export-field export-frames">
    <legend className="export-label">
      {pick(options.format === "html", uiCopy.pagesFromFrames, uiCopy.frames)}
    </legend>
    {options.frames.map((choice) => (
      <ExportFrameRow
        key={choice.id}
        choice={choice}
        label={labels.get(choice.id) ?? EMPTY_LABEL}
        isPicked={options.picked.has(choice.id)}
        onToggle={onToggle}
      />
    ))}
  </fieldset>
);

export { ExportFrameList };
