import { useId, useState } from 'react';
import type { DesignSystemCheckResult, RunLevel, RunRequest } from '../../shared/contracts';
import type { RunView } from '../runState';

export const IMPROVE_PROMPT = 'Improve this design system.';

export function improveRequest(focus: string, defaultLevel: RunLevel | undefined): RunRequest {
  const trimmed = focus.trim();
  const level: RunLevel = !defaultLevel || defaultLevel === 'wireframe' ? 'prototype' : defaultLevel;
  return { prompt: trimmed ? `${IMPROVE_PROMPT}\n\nFocus: ${trimmed}` : IMPROVE_PROMPT, mode: 'edit', task: 'design-system', level };
}

export function lastImproveRun(runs: readonly RunView[]): RunView | null {
  return [...runs].reverse().find((run) => run.request?.task === 'design-system') ?? null;
}

export function improvePassed(run: RunView | null): boolean {
  return run?.summary?.status === 'completed' && run.summary.designSystemCheck?.passed === true;
}

interface ImproveProps {
  running: boolean;
  run: RunView | null;
  onImprove: (focus: string) => Promise<void>;
}

export function ImproveControl({ running, run, onImprove }: ImproveProps) {
  const improving = run?.status === 'running';
  const primary = !improvePassed(run);
  const [focus, setFocus] = useState('');
  const [busy, setBusy] = useState(false);
  const start = async () => {
    setBusy(true);
    try {
      await onImprove(focus);
      setFocus('');
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      className="draft-improve"
      onSubmit={(event) => {
        event.preventDefault();
        if (!running && !busy) void start();
      }}
    >
      <input className="draft-focus" value={focus} maxLength={500} placeholder="What should the AI focus on?" aria-label="What should the AI focus on?" disabled={running} onChange={(event) => setFocus(event.target.value)} />
      <button type="submit" className={`btn small${primary ? ' primary' : ''}`} disabled={running || busy}>
        {improving ? 'Improving…' : 'Improve with AI'}
      </button>
    </form>
  );
}

function runNote(run: RunView | null): string | null {
  const summary = run?.summary;
  if (!summary || summary.status === 'running') return null;
  if (summary.status === 'failed' && summary.designSystemCheck && !summary.designSystemCheck.passed) return `The last AI run stopped: the check still failed after ${summary.designSystemCheck.rounds} fix round(s).`;
  if (summary.status === 'failed' || summary.status === 'budget_exceeded') return `The last AI run did not finish: ${summary.error ?? summary.status}`;
  return null;
}

export function CheckStatus({ check, run }: { check: DesignSystemCheckResult | null; run: RunView | null }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  if (!check) return null;
  const note = runNote(run);
  if (check.passed) {
    return (
      <span className="draft-check passed" role="status">
        Check passed
      </span>
    );
  }
  const count = check.problems.length;
  return (
    <span className="draft-check failed">
      <button type="button" className="draft-check-toggle" aria-expanded={open} aria-controls={listId} onClick={() => setOpen((value) => !value)}>
        {count} problem{count === 1 ? '' : 's'}
      </button>
      {open && (
        <div className="draft-problems" id={listId} role="region" aria-label="Design system check problems">
          {note && <p className="draft-problems-note">{note}</p>}
          <ul>
            {check.problems.map((problem, index) => (
              <li key={`${problem.rule}-${index}`}>
                <span className="draft-rule">{problem.rule}</span> {problem.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </span>
  );
}
