import { useEffect, useRef, useState, type FormEvent } from 'react';
import type { Project, ProjectSettings } from '../../shared/contracts';
import { api, errorText } from '../api';

const PRESETS: (number | null)[] = [null, 0.5, 1, 2, 5];

function money(value: number): string {
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
}

function limitLabel(value: number | null): string {
  return value === null ? 'No limit' : `${money(value)} limit`;
}

function parseLimit(raw: string): number | null | 'bad' {
  const text = raw.trim().replace(/^\$/, '');
  if (text === '') return null;
  const value = Number(text);
  return Number.isFinite(value) && value >= 0.01 && value <= 50 ? Math.round(value * 100) / 100 : 'bad';
}

interface Props {
  projectId: string;
  settings: ProjectSettings;
  onSaved: (project: Project) => void;
}

export function BudgetIndicator({ projectId, settings, onSaved }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState<number | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const current = pending === undefined ? settings.maxBudgetUsd : pending;
  const save = (value: number | null) => {
    setPending(value);
    setError(null);
    api.updateSettings(projectId, { maxBudgetUsd: value }).then(
      (project) => {
        onSaved(project);
        setPending(undefined);
        setOpen(false);
      },
      (err: unknown) => {
        setPending(undefined);
        setError(errorText(err));
      },
    );
  };
  return (
    <span className="budget-ind-wrap">
      <button
        type="button"
        className="skills-ind budget-ind"
        data-testid="budget-indicator"
        aria-expanded={open}
        aria-haspopup="menu"
        data-tip-side="top"
        data-tip-align="end"
        data-tip={current === null ? 'No spending limit per run. Click to set one.' : `Each run stops at ${money(current)}. Click to change.`}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={() => setOpen((x) => !x)}
      >
        {limitLabel(current)}
      </button>
      {open && <BudgetMenu current={current} error={error} onPick={save} onClose={() => setOpen(false)} />}
    </span>
  );
}

function BudgetMenu({ current, error, onPick, onClose }: { current: number | null; error: string | null; onPick: (value: number | null) => void; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [custom, setCustom] = useState('');
  const [bad, setBad] = useState(false);
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('mousedown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const value = parseLimit(custom);
    setBad(value === 'bad');
    if (value !== 'bad') onPick(value);
  };
  return (
    <div ref={ref} className="ui-menu budget-pop" role="menu" aria-label="Spending limit per run" data-testid="budget-menu">
      <div className="ui-menu-section">
        <div className="ui-menu-label">Spending limit per run</div>
        {PRESETS.map((value) => (
          <button key={value ?? 'none'} type="button" role="menuitemradio" aria-checked={current === value} className="ui-menu-item" onClick={() => onPick(value)}>
            {value === null ? 'No limit' : money(value)}
          </button>
        ))}
      </div>
      <form className="ui-menu-section budget-custom" onSubmit={submit}>
        <label className="budget-custom-row">
          <span>Other</span>
          <input
            aria-label="Other spending limit in dollars"
            inputMode="decimal"
            placeholder="0.01 to 50"
            value={custom}
            aria-invalid={bad || undefined}
            onChange={(e) => setCustom(e.target.value)}
          />
        </label>
        <button type="submit" className="btn small">
          Set
        </button>
      </form>
      {(bad || error) && <p className="ui-menu-note budget-error" role="alert">{error ?? 'Enter $0.01 to $50, or leave it empty for no limit.'}</p>}
    </div>
  );
}
