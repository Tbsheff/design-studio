import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { FrameChoice } from "./export-api.js";
import { ExportFrameRow } from "./export-frame-row.js";
import type { FrameLabel } from "./frame-label.js";

interface ShareFrameListProps {
  readonly frames: readonly FrameChoice[];
  readonly picked: ReadonlySet<string>;
  readonly labels: ReadonlyMap<string, FrameLabel>;
  readonly onToggle: (id: string) => void;
}

const EMPTY_LABEL: FrameLabel = { name: "", page: "" };

const ShareFrameList = ({
  frames,
  labels,
  onToggle,
  picked,
}: ShareFrameListProps): ReactElement => (
  <fieldset className="export-field export-frames">
    <legend className="export-label">{copy.frames}</legend>
    {frames.map((choice) => (
      <ExportFrameRow
        key={choice.id}
        choice={choice}
        label={labels.get(choice.id) ?? EMPTY_LABEL}
        isPicked={picked.has(choice.id)}
        onToggle={onToggle}
      />
    ))}
  </fieldset>
);

export { ShareFrameList };
