import type { FinishedRun } from './server-link.js';

export const NOTIFY_ENV = 'STUDIO_DESKTOP_NOTIFY';
const PROMPT_CHARS = 80;

export interface RunNotice {
  title: string;
  body: string;
  projectId: string;
  runId: string;
  status: string;
}

function shortPrompt(prompt: string): string {
  const line = prompt.replace(/\s+/g, ' ').trim();
  return line.length > PROMPT_CHARS ? `${line.slice(0, PROMPT_CHARS - 1)}…` : line;
}

export function runNotice(finished: FinishedRun, projectName: string | null, windowFocused: boolean): RunNotice | null {
  if (windowFocused || finished.status === 'canceled') return null;
  const ok = finished.status === 'completed';
  const title = ok ? 'Run finished' : finished.status === 'budget_exceeded' ? 'Run stopped at the budget limit' : 'Run failed';
  const where = projectName ?? 'Design Studio';
  const detail = ok ? shortPrompt(finished.run.prompt) : (finished.error ?? shortPrompt(finished.run.prompt));
  return { title, body: detail ? `${where}: ${detail}` : where, projectId: finished.run.projectId, runId: finished.run.runId, status: finished.status };
}
