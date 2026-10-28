import { memo, useState } from 'react';
import type { TodoItem } from '../../shared/contracts';
import { Icon } from './Icon';

export function todoProgress(todos: TodoItem[]): { current: number; total: number } {
  const done = todos.filter((todo) => todo.status === 'completed').length;
  const active = todos.some((todo) => todo.status === 'in_progress');
  return { current: Math.min(todos.length, done + (active ? 1 : 0)), total: todos.length };
}

function rowState(todo: TodoItem): { className: string; label: string; tag: string | null } {
  if (todo.skipped) return { className: 'skipped', label: 'skipped', tag: 'Skipped' };
  if (todo.status === 'completed') return { className: todo.by === 'run' ? 'completed by-run' : 'completed', label: todo.by === 'run' ? 'done, not shown by a step' : 'done', tag: todo.by === 'run' ? 'Unverified' : null };
  return { className: todo.status, label: todo.status === 'in_progress' ? 'in progress' : 'to do', tag: null };
}

function TodoMark({ todo, running }: { todo: TodoItem; running: boolean }) {
  if (todo.skipped) return <Icon name="minus" size={12} />;
  if (todo.status === 'completed') return <Icon name="check" size={12} />;
  return todo.status === 'in_progress' && running ? <span className="spinner" /> : null;
}

function TodoRow({ todo, running }: { todo: TodoItem; running: boolean }) {
  const view = rowState(todo);
  return (
    <li className={`todo-item ${view.className}`} aria-current={todo.status === 'in_progress' && !todo.skipped ? 'step' : undefined} data-tip={todo.note} data-by={todo.by}>
      <span className="todo-mark" aria-hidden="true">
        <TodoMark todo={todo} running={running} />
      </span>
      <span className="todo-text">{todo.status === 'in_progress' && todo.activeForm ? todo.activeForm : todo.content}</span>
      {view.tag && <span className="todo-tag">{view.tag}</span>}
      <span className="sr-only">{view.label}</span>
    </li>
  );
}

export const TodoPanel = memo(function TodoPanel({ todos, running }: { todos: TodoItem[]; running: boolean }) {
  const [choice, setChoice] = useState<boolean | null>(null);
  const [ranWith, setRanWith] = useState(running);
  if (ranWith !== running) {
    setRanWith(running);
    setChoice(null);
  }
  const open = choice ?? running;
  if (todos.length === 0) return null;
  const { current, total } = todoProgress(todos);
  return (
    <section className="todo-panel" aria-label="Todo list" data-testid="todo-panel">
      <button type="button" className="todo-head" aria-expanded={open} onClick={() => setChoice(!open)}>
        <Icon name={open ? 'chevronDown' : 'chevronRight'} size={12} />
        <span>Todos</span>
        <span className="todo-count tabular-nums" data-testid="todo-count">
          {current} of {total}
        </span>
      </button>
      {open && (
        <ol className="todo-list">
          {todos.map((todo, index) => (
            <TodoRow key={`${index}-${todo.content}`} todo={todo} running={running} />
          ))}
        </ol>
      )}
    </section>
  );
});
