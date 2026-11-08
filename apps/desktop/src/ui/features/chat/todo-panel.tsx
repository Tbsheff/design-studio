import type { TodoItem } from "@design-studio/contracts";
import { memo, useState } from "react";

import { copy } from "./copy.js";
import { TodoHead } from "./todo-head.js";
import { todoProgress } from "./todo-model.js";
import { TodoRow } from "./todo-row.js";

const TodoPanel = memo(
  ({ todos, running }: { todos: TodoItem[]; running: boolean }) => {
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
              <TodoRow
                key={`${index}-${todo.content}`}
                todo={todo}
                running={running}
              />
            ))}
          </ol>
        )}
      </section>
    );
  }
);

TodoPanel.displayName = "TodoPanel";

export { TodoPanel };
