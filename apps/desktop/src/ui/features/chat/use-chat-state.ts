import { useMemo } from "react";

import type { TodoItem } from "@design-studio/actions/_core/contracts";
import type { RunView } from "./run-state-model.js";

export const promptHistoryOf = (
  runs: readonly Pick<RunView, "request">[]
): string[] => {
  const prompts: string[] = [];

  for (const run of runs) {
    const { request } = run;

    const prompt =
      request && !request.task && !request.variation && !request.retryOf
        ? request.prompt.trim()
        : "";

    if (prompt && prompts.at(-1) !== prompt) {
      prompts.push(prompt);
    }
  }

  return prompts;
};

export const useChatState = (
  runs: readonly RunView[]
): {
  history: string[];
  todos: { todos: TodoItem[]; running: boolean } | null;
  contextTokens: number | null;
} => {
  const history = useMemo(() => promptHistoryOf(runs), [runs]);
  const last = runs.at(-1) ?? null;
  const todoList = last?.todos ?? null;
  const running = last?.status === "running";

  const todos = useMemo(
    () =>
      todoList && todoList.length > 0 ? { running, todos: todoList } : null,
    [todoList, running]
  );

  return { contextTokens: last?.contextTokens ?? null, history, todos };
};
