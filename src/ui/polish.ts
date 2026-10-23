import type { RunRequest } from '../shared/contracts';
import type { RunView } from './runState';

export const POLISH_REQUEST: RunRequest = {
  prompt: 'Polish this design: run every check, fix what you find, keep the content and structure.',
  mode: 'edit',
  level: 'polish',
};

export function canPolishRun(run: RunView, headVersionId: string | null): boolean {
  const summary = run.summary;
  if (!summary || summary.status !== 'completed' || !headVersionId) return false;
  if (summary.level === 'polish') return false;
  return summary.versionId === headVersionId;
}
