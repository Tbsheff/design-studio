import type { StartPoint } from "@design-studio/contracts/start-points";
import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { FocusEvent, KeyboardEvent, ReactElement } from "react";

import { startCopy } from "./copy.js";

interface StartPointRowProps {
  readonly index: number;
  readonly point: StartPoint;
  readonly frameTitle: string;
  readonly isTaken: (name: string, index: number) => boolean;
  readonly onRename: (index: number, name: string) => void;
  readonly onRemove: (index: number) => void;
}

const StartPointRow = ({
  index,
  point,
  frameTitle,
  isTaken,
  onRename,
  onRemove,
}: StartPointRowProps): ReactElement => {
  const commit = useCallback(
    (input: HTMLInputElement): void => {
      const name = input.value.trim();

      if (name === "" || name === point.name || isTaken(name, index)) {
        input.value = point.name;

        return;
      }

      onRename(index, name);
    },
    [index, isTaken, onRename, point.name]
  );

  const onBlur = useCallback(
    (event: FocusEvent<HTMLInputElement>): void => commit(event.currentTarget),
    [commit]
  );

  const onKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>): void => {
      if (event.key === "Enter") {
        commit(event.currentTarget);
      }
    },
    [commit]
  );

  const onRemoveClick = useCallback(
    (): void => onRemove(index),
    [index, onRemove]
  );

  return (
    <div className="start-row" data-testid="start-point-row">
      <Icon name="play" size={12} />
      <input
        className="start-row-name"
        defaultValue={point.name}
        aria-label={startCopy.rename}
        maxLength={40}
        onBlur={onBlur}
        onKeyDown={onKeyDown}
      />
      <span className="start-row-frame truncate">{frameTitle}</span>
      <button
        type="button"
        className="icon-btn small"
        aria-label={startCopy.remove}
        data-tip={startCopy.remove}
        onClick={onRemoveClick}
      >
        <Icon name="close" size={12} />
      </button>
    </div>
  );
};

export { StartPointRow };
