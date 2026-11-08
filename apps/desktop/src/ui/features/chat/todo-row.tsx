import type { TodoItem } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { TodoMark } from "./todo-mark.js";
import { isCurrentStep, toRowView, toTodoText } from "./todo-model.js";

const TodoRow = ({
  todo,
  running,
}: {
  todo: TodoItem;
  running: boolean;
}): ReactElement => {
  const view = toRowView(todo);

  return (
    <li
      className={`todo-item ${view.className}`}
      aria-current={isCurrentStep(todo) && "step"}
      data-tip={todo.note}
      data-by={todo.by}
    >
      <span className="todo-mark" aria-hidden="true">
        <TodoMark todo={todo} running={running} />
      </span>
      <span className="todo-text">{toTodoText(todo)}</span>
      {view.tag && <span className="todo-tag">{view.tag}</span>}
      <span className="sr-only">{view.label}</span>
    </li>
  );
};

export { TodoRow };
