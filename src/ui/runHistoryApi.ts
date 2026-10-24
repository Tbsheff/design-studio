import type { RunSummary } from '../shared/contracts';
import { json } from './api';

export function renameRun(runId: string, title: string): Promise<RunSummary> {
  return json<RunSummary>('PATCH', `/api/runs/${encodeURIComponent(runId)}`, { title });
}
