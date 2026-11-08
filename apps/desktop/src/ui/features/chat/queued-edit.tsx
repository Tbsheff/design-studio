import { useCallback } from "react";
import type { ChangeEvent, KeyboardEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import { toEditRows } from "./queued-model.js";

const QueuedEdit = ({
  text,
  onText,
  onFinish,
}: {
  text: string;
  onText: (text: string) => void;
  onFinish: (save: boolean) => void;
}): ReactElement => {
  const onChange = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>) => onText(event.target.value),
    [onText]
  );

  const onBlur = useCallback(() => onFinish(true), [onFinish]);

  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        event.preventDefault();
        onFinish(false);

        return;
      }

      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        onFinish(true);
      }
    },
    [onFinish]
  );

  return (
    <textarea
      className="queued-edit"
      aria-label={copy.editQueuedMessage}
      name="queued-message"
      value={text}
      rows={toEditRows(text)}
      onChange={onChange}
      onBlur={onBlur}
      onKeyDown={onKeyDown}
    />
  );
};

export { QueuedEdit };
