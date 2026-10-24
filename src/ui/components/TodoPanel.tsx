import { memo, useState } from 'react';
import type { TodoItem } from '../../shared/contracts';
import { Icon } from './Icon';

export function todoProgress(todos: TodoItem[]): { current: number; total: number } {
  const done = todos.filter((todo) => todo.status === 'completed').length;
  const active = todos.some((todo) => todo.status === 'in_progress');
  return { current: Math.min(todos.length, done + (active ? 1 : 0)), total: todos.length };
}

export const TodoPanel = memo(function TodoPanel({ todos, running }: { todos: TodoItem[]; running: boolean }) {
  const [open, setOpen] = useState(true);
  if (todos.length === 0) return null;
  const { current, total } = todoProgress(todos);
  return (
    <section className="todo-panel" aria-label="Todo list" data-testid="todo-panel">
      <button type="button" className="todo-head" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={12} />
        <span>Todos</span>
        <span className="todo-count tabular-nums" data-testid="todo-count">
          {current} of {total}
        </span>
      </button>
      {open && (
        <ol className="todo-list">
          {todos.map((todo, index) => (
            <li key={`${index}-${todo.content}`} className={`todo-item ${todo.status}`} aria-current={todo.status === 'in_progress' ? 'step' : undefined}>
              <span className="todo-mark" aria-hidden="true">
                {todo.status === 'completed' ? <Icon name="check" size={12} /> : todo.status === 'in_progress' && running ? <span className="spinner" /> : null}
              </span>
              <span className="todo-text">{todo.status === 'in_progress' && todo.activeForm ? todo.activeForm : todo.content}</span>
              <span className="sr-only">{todo.status === 'completed' ? 'done' : todo.status === 'in_progress' ? 'in progress' : 'to do'}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
});
