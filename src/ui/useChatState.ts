import { useMemo } from 'react';
import type { TodoItem } from '../shared/contracts';
import type { RunView } from './runState';

export function promptHistoryOf(runs: readonly Pick<RunView, 'request'>[]): string[] {
  const prompts: string[] = [];
  for (const run of runs) {
    const request = run.request;
    const prompt = request && !request.task && !request.variation && !request.retryOf ? request.prompt.trim() : '';
    if (prompt && prompts.at(-1) !== prompt) prompts.push(prompt);
  }
  return prompts;
}

export function useChatState(runs: readonly RunView[]): { history: string[]; todos: { todos: TodoItem[]; running: boolean } | null; contextTokens: number | null } {
  const history = useMemo(() => promptHistoryOf(runs), [runs]);
  const last = runs.at(-1) ?? null;
  const todoList = last?.todos ?? null;
  const running = last?.status === 'running';
  const todos = useMemo(() => (todoList && todoList.length > 0 ? { todos: todoList, running } : null), [todoList, running]);
  return { history, todos, contextTokens: last?.contextTokens ?? null };
}
