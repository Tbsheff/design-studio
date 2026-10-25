import { useEffect, useRef } from 'react';
import type { RunStatus } from '../shared/contracts';
import type { RunMap } from './runState';

const STATUS_TEXT: Partial<Record<RunStatus, string>> = {
  completed: 'Run finished',
  failed: 'Run failed',
  budget_exceeded: 'Run stopped at the budget limit',
};

function canNotify(): boolean {
  return document.hidden && !('studioDesktop' in window) && typeof Notification !== 'undefined' && Notification.permission === 'granted';
}

function newlyFinished(runs: RunMap, since: number, shown: Set<string>): string[] {
  const out: string[] = [];
  for (const run of Object.values(runs)) {
    const finishedAt = run.summary?.finishedAt ?? null;
    const text = STATUS_TEXT[run.status];
    if (finishedAt === null || finishedAt < since || !text || shown.has(run.runId)) continue;
    shown.add(run.runId);
    out.push(text);
  }
  return out;
}

export function useRunNotice(projectName: string | null, runs: RunMap): void {
  const hiddenAt = useRef<number | null>(null);
  const shown = useRef(new Set<string>());
  useEffect(() => {
    const onVisibility = () => {
      hiddenAt.current = document.hidden ? Date.now() : null;
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, []);
  useEffect(() => {
    if (hiddenAt.current === null || !canNotify()) return;
    const finished = newlyFinished(runs, hiddenAt.current, shown.current);
    if (finished.length === 0) return;
    const body = finished.length === 1 ? (finished[0] ?? '') : `${finished.length} runs ended`;
    const notice = new Notification(projectName || 'Run finished', { body });
    notice.onclick = () => window.focus();
  }, [projectName, runs]);
}
