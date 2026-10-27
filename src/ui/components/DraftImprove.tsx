import { useId, useRef, useState } from 'react';
import { useFitPopover } from '../popoverPlacement';
import type { DesignSystemCheckResult, DesignSystemCheckRule, RunLevel, RunRequest } from '../../shared/contracts';
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

const RULE_LABEL: Record<DesignSystemCheckRule, string> = {
  'design-md': 'DESIGN.md sections to write',
  tokens: 'Tokens',
  contrast: 'Contrast',
  'kit-colors': 'Kit page colors',
  fonts: 'Fonts',
};

const RULE_ORDER: DesignSystemCheckRule[] = ['contrast', 'tokens', 'fonts', 'kit-colors', 'design-md'];

const MORE = /^(\d+) more .+ not listed\.?$/;

function problemText(rule: DesignSystemCheckRule, message: string): string {
  const more = MORE.exec(message)?.[1];
  if (more) return `And ${more} more`;
  if (rule !== 'design-md') return message;
  const todo = /to-do line:\s*_?\s*To do:\s*(.+?)_?\s*$/i.exec(message);
  const found = todo?.[1];
  if (!found) return message;
  const text = found.trim().replace(/\.$/, '');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function groupProblems(problems: DesignSystemCheckResult['problems']): Array<{ rule: DesignSystemCheckRule; items: string[] }> {
  return RULE_ORDER.map((rule) => ({ rule, items: problems.filter((problem) => problem.rule === rule).map((problem) => problemText(rule, problem.message)) })).filter((group) => group.items.length > 0);
}

export function CheckStatus({ check, run }: { check: DesignSystemCheckResult | null; run: RunView | null }) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  useFitPopover(listRef, toggleRef, open);
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
      <button ref={toggleRef} type="button" className="draft-check-toggle" aria-expanded={open} aria-controls={listId} onClick={() => setOpen((value) => !value)}>
        {count} problem{count === 1 ? '' : 's'}
      </button>
      {open && (
        <div ref={listRef} className="draft-problems" id={listId} role="region" aria-label="Design system check problems">
          {note && <p className="draft-problems-note">{note}</p>}
          {groupProblems(check.problems).map((group) => (
            <section key={group.rule} className="draft-problem-group">
              <h3>
                {RULE_LABEL[group.rule]} <span className="draft-problem-count">{group.items.length}</span>
              </h3>
              <ul>
                {group.items.map((text, index) => (
                  <li key={`${group.rule}-${index}`}>{text}</li>
                ))}
              </ul>
            </section>
          ))}
          <p className="draft-problems-hint">Improve with AI fills these in, or edit DESIGN.md yourself.</p>
        </div>
      )}
    </span>
  );
}
