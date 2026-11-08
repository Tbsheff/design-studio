import { useCallback } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { copy } from "./copy.js";

interface FieldProps {
  readonly onTask: (task: string) => void;
  readonly task: string;
}

const WalkthroughTaskField = ({ onTask, task }: FieldProps): ReactElement => {
  const updateTask = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onTask(event.target.value);
    },
    [onTask]
  );

  return (
    <input
      aria-label={copy.walkTaskLabel}
      name="task"
      onChange={updateTask}
      placeholder={copy.walkTaskPlaceholder}
      type="text"
      value={task}
    />
  );
};

export { WalkthroughTaskField };

export type { FieldProps };
