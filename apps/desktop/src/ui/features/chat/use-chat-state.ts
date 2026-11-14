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

interface ChatState {
  history: string[];
  todos: { todos: TodoItem[]; running: boolean } | null;
  contextTokens: number | null;
  contextWindow: number | null;
}

const useChatState = (runs: readonly RunView[]): ChatState => {
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

  const contextWindow =
    runs.findLast((run) => run.contextWindow !== null)?.contextWindow ?? null;

  return {
    contextTokens: last?.contextTokens ?? null,
    contextWindow,
    history,
    todos,
  };
};

export { promptHistoryOf, useChatState };

export type { ChatState };
