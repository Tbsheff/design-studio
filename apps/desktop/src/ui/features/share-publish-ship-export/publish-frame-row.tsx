import { useCallback } from "react";
import type { ReactElement } from "react";

import type { FrameChoice } from "./export-api.js";

interface PublishFrameRowProps {
  readonly choice: FrameChoice;
  readonly name: string;
  readonly isPicked: boolean;
  readonly onToggle: (id: string) => void;
}

const PublishFrameRow = ({
  choice,
  isPicked,
  name,
  onToggle,
}: PublishFrameRowProps): ReactElement => {
  const toggleFrame = useCallback((): void => {
    onToggle(choice.id);
  }, [choice.id, onToggle]);

  return (
    <label className="export-frame">
      <input type="checkbox" checked={isPicked} onChange={toggleFrame} />
      <span className="export-frame-name">{name}</span>
      <span className="export-frame-size">
        {`${choice.frame.width} × ${choice.frame.height}`}
      </span>
    </label>
  );
};

export { PublishFrameRow };
