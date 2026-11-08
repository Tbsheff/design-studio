import type { TodoItem } from "@design-studio/contracts";
import { useMemo } from "react";

import type { RunView } from "./run-state-model.js";

const promptHistoryOf = (
  runs: readonly Pick<RunView, "request">[]
): string[] => {
  const prompts: string[] = [];

  for (const run of runs) {
    const { request } = run;

    let prompt = "";

    if (request && !request.task && !request.variation && !request.retryOf) {
      prompt = request.prompt.trim();
    }

    if (prompt && prompts.at(-1) !== prompt) {
      prompts.push(prompt);
    }
  }

  return prompts;
};

const useChatState = (
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

  const todos = useMemo(() => {
    if (todoList && todoList.length > 0) {
      return { running, todos: todoList };
    }

    return null;
  }, [todoList, running]);

  return { contextTokens: last?.contextTokens ?? null, history, todos };
};

export { promptHistoryOf, useChatState };
