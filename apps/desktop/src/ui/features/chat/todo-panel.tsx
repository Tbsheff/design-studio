import type { TodoItem } from "@design-studio/contracts";
import { memo, useState } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { TodoHead } from "./todo-head.js";
import { toTodoKeys, todoProgress } from "./todo-model.js";
import { TodoRow } from "./todo-row.js";

const TodoPanelBody = ({
  todos,
  running,
}: {
  todos: TodoItem[];
  running: boolean;
}): ReactElement | null => {
  const [choice, setChoice] = useState<boolean | null>(null);
  const [ranWith, setRanWith] = useState(running);

  if (ranWith !== running) {
    setRanWith(running);
    setChoice(null);
  }

  const open = choice ?? running;

  if (todos.length === 0) {
    return null;
  }

  const { current, total } = todoProgress(todos);
  const todoKeys = toTodoKeys(todos);

  return (
    <section
      className="todo-panel"
      aria-label={copy.todoList}
      data-testid="todo-panel"
    >
      <TodoHead
        isOpen={open}
        current={current}
        total={total}
        onToggle={setChoice}
      />
      {open && (
        <ol className="todo-list">
          {todos.map((todo, index) => (
            <TodoRow key={todoKeys[index]} todo={todo} running={running} />
          ))}
        </ol>
      )}
    </section>
  );
};

const TodoPanel = memo(TodoPanelBody);

export { TodoPanel };
