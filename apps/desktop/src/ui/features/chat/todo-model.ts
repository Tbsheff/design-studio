import type { TodoItem } from "@design-studio/contracts";

interface RowView {
  className: string;
  label: string;
  tag: string | null;
}

interface TodoProgress {
  current: number;
  total: number;
}

const todoProgress = (todos: TodoItem[]): TodoProgress => {
  const done = todos.filter((todo) => todo.status === "completed").length;
  let active = 0;

  if (todos.some((todo) => todo.status === "in_progress")) {
    active = 1;
  }

  return {
    current: Math.min(todos.length, done + active),
    total: todos.length,
  };
};

const toCompletedView = (todo: TodoItem): RowView => {
  if (todo.by === "run") {
    return {
      className: "completed by-run",
      label: "done, not shown by a step",
      tag: "Unverified",
    };
  }

  return { className: "completed", label: "done", tag: null };
};

const toRowView = (todo: TodoItem): RowView => {
  if (todo.skipped) {
    return { className: "skipped", label: "skipped", tag: "Skipped" };
  }

  if (todo.status === "completed") {
    return toCompletedView(todo);
  }

  if (todo.status === "in_progress") {
    return { className: todo.status, label: "in progress", tag: null };
  }

  return { className: todo.status, label: "to do", tag: null };
};

const isCurrentStep = (todo: TodoItem): boolean =>
  todo.status === "in_progress" && !todo.skipped;

const toTodoText = (todo: TodoItem): string => {
  if (todo.status === "in_progress" && todo.activeForm) {
    return todo.activeForm;
  }

  return todo.content;
};

export { isCurrentStep, todoProgress, toRowView, toTodoText };
