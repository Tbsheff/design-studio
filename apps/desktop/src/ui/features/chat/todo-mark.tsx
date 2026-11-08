import type { TodoItem } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

const TodoMark = ({
  todo,
  running,
}: {
  todo: TodoItem;
  running: boolean;
}): ReactElement | null => {
  if (todo.skipped) {
    return <Icon name="minus" size={12} />;
  }

  if (todo.status === "completed") {
    return <Icon name="check" size={12} />;
  }

  if (todo.status === "in_progress" && running) {
    return <span className="spinner" />;
  }

  return null;
};

export { TodoMark };
