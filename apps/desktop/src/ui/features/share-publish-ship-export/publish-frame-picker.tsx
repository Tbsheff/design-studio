import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { FrameChoice } from "./export-api.js";
import type { FrameLabel } from "./frame-label.js";
import { PublishFrameRow } from "./publish-frame-row.js";

interface PublishFramePickerProps {
  readonly frames: readonly FrameChoice[];
  readonly labels: ReadonlyMap<string, FrameLabel>;
  readonly picked: ReadonlySet<string>;
  readonly onToggle: (id: string) => void;
}

const PublishFramePicker = ({
  frames,
  labels,
  onToggle,
  picked,
}: PublishFramePickerProps): ReactElement => (
  <fieldset className="export-field export-frames">
    <legend className="export-label">{copy.framesPublishedAsImages}</legend>
    {frames.map((choice) => (
      <PublishFrameRow
        key={choice.id}
        choice={choice}
        name={labels.get(choice.id)?.name ?? ""}
        isPicked={picked.has(choice.id)}
        onToggle={onToggle}
      />
    ))}
  </fieldset>
);

export { PublishFramePicker };
