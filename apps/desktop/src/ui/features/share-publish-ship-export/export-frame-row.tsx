import { useCallback } from "react";
import type { ReactElement } from "react";

import { frameRoute } from "./export-api.js";
import type { FrameChoice } from "./export-api.js";
import type { FrameLabel } from "./frame-label.js";

interface ExportFrameRowProps {
  readonly choice: FrameChoice;
  readonly label: FrameLabel;
  readonly isPicked: boolean;
  readonly onToggle: (id: string) => void;
}

const ExportFrameRow = ({
  choice,
  isPicked,
  onToggle,
  label,
}: ExportFrameRowProps): ReactElement => {
  const { frame } = choice;

  const toggleFrame = useCallback((): void => {
    onToggle(choice.id);
  }, [choice.id, onToggle]);

  return (
    <label className="export-frame">
      <input type="checkbox" checked={isPicked} onChange={toggleFrame} />
      <span className="export-frame-name">{label.name}</span>
      <span className="export-frame-path truncate" data-tip={frameRoute(frame)}>
        {label.page}
      </span>
      <span className="export-frame-size">
        {`${frame.width} × ${frame.height}`}
      </span>
    </label>
  );
};

export { ExportFrameRow };
