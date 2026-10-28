import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useFitPopover } from '../popoverPlacement';
import type { CoverageGrade, DesignSystemCheckResult, DesignSystemCoverage, DesignSystemState, Project } from '../../shared/contracts';
import { api, errorText } from '../api';
import { findPack, usePacks } from '../packs';
import type { RunView } from '../runState';
import { CheckStatus, improvePassed } from './DraftImprove';

const GRADE_LABELS: Record<CoverageGrade, string> = {
  excellent: 'Excellent',
  usable: 'Usable',
  'needs-review': 'Needs review',
  rebuild: 'Rebuild',
};

interface DraftInfoState {
  coverage: DesignSystemCoverage | null;
  check: DesignSystemCheckResult | null;
  error: string | null;
}

function useDraftInfo(projectId: string, lastChange: unknown, runStatus: string | undefined): DraftInfoState {
  const [state, setState] = useState<DraftInfoState>({ coverage: null, check: null, error: null });
  useEffect(() => {
    let live = true;
    api
      .getDesignSystemDraft(projectId)
      .then((info) => live && setState({ coverage: info.coverage, check: info.check, error: null }))
      .catch((err) => live && setState({ coverage: null, check: null, error: errorText(err) }));
    return () => {
      live = false;
    };
  }, [projectId, lastChange, runStatus]);
  return state;
}

function cssVarOf(token: string): string {
  const [group, name] = token.split('.');
  return group === 'color' ? `--${name}` : `--${group}-${name}`;
}

function Fallbacks({ tokens }: { tokens: string[] }) {
  if (tokens.length === 0) return <span className="draft-fallbacks">No fallback tokens</span>;
  return (
    <span className="draft-fallbacks" data-tip={`From base: ${tokens.map(cssVarOf).join(', ')}`} data-tip-align="start">
      {tokens.length} from base
      <span className="sr-only">: {tokens.map(cssVarOf).join(', ')}</span>
    </span>
  );
}

function SaveAnyway({ count, busy, onSave }: { count: number; busy: boolean; onSave: () => void }) {
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const confirmRef = useRef<HTMLButtonElement>(null);
  const popId = useId();
  useFitPopover(popRef, toggleRef, open);
  useEffect(() => {
    if (!open) return;
    confirmRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      toggleRef.current?.focus();
    };
    const onDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!popRef.current?.contains(target) && !toggleRef.current?.contains(target)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('mousedown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('mousedown', onDown);
    };
  }, [open]);
  return (
    <span className="draft-save-anyway">
      <button ref={toggleRef} type="button" className="btn ghost small" aria-expanded={open} aria-controls={popId} disabled={busy} onClick={() => setOpen((value) => !value)}>
        Save anyway
      </button>
      {open && (
        <div ref={popRef} id={popId} className="ui-popover draft-confirm" role="dialog" aria-label="Save anyway">
          <p>
            The check found {count} problem{count === 1 ? '' : 's'}. Save anyway?
          </p>
          <div className="draft-confirm-actions">
            <button type="button" className="btn ghost small" onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button
              ref={confirmRef}
              type="button"
              className="btn primary small"
              onClick={() => {
                setOpen(false);
                onSave();
              }}
            >
              Save anyway
            </button>
          </div>
        </div>
      )}
    </span>
  );
}

interface Props {
  project: Project;
  state: DesignSystemState | null;
  lastChange: unknown;
  onSave: (name: string, packId: string, force?: boolean) => Promise<void>;
  improve?: ReactNode;
  lastRun?: RunView | null;
  reading?: boolean;
  running?: boolean;
}

function saveReason(check: DesignSystemCheckResult | null, reading: boolean, running: boolean): string | null {
  if (reading) return 'Save is off while the studio reads your sources.';
  if (running) return 'Save is off while the AI works on this design system.';
  if (!check || check.passed) return null;
  const count = check.problems.length;
  return `Save is off: the check found ${count} problem${count === 1 ? '' : 's'}. Improve with AI fixes them.`;
}

const KEY_TOKENS = ['color.bg', 'color.fg', 'color.primary', 'font.body'];

function guessedKeys(coverage: DesignSystemCoverage): string[] | null {
  if (!coverage.tokens.some((entry) => entry.source === 'folder' || entry.source === 'tokens-file')) return null;
  return KEY_TOKENS.filter((token) => coverage.tokens.find((entry) => entry.token === token)?.verified !== true);
}

function Guessed({ coverage }: { coverage: DesignSystemCoverage }) {
  const keys = guessedKeys(coverage);
  if (keys === null) return null;
  if (keys.length === 0) return <span className="draft-fallbacks">Key tokens checked</span>;
  const names = keys.map(cssVarOf).join(', ');
  return (
    <span className="draft-fallbacks" data-tip={`Not found under their usual names in the source, so these are guesses: ${names}`} data-tip-align="start">
      {keys.length} guessed
      <span className="sr-only">: {names}</span>
    </span>
  );
}

function DraftSummary({ name, coverage, check, run, error }: { name: string; coverage: DesignSystemCoverage | null; check: DesignSystemCheckResult | null; run: RunView | null; error: string | null }) {
  return (
    <div className="draft-main">
      <strong className="truncate">{name}</strong>
      {coverage && (
        <span className={`draft-grade grade-${coverage.grade}`} aria-label={`Coverage ${coverage.score} of 100, ${GRADE_LABELS[coverage.grade]}`}>
          {GRADE_LABELS[coverage.grade]} · {coverage.score}/100
        </span>
      )}
      {coverage && <Fallbacks tokens={coverage.fallbacks} />}
      {coverage && <Guessed coverage={coverage} />}
      <CheckStatus check={check} run={run} />
      {error && <span className="draft-fallbacks">Could not load coverage. {error}</span>}
    </div>
  );
}

interface SaveProps {
  check: DesignSystemCheckResult | null;
  ready: boolean;
  readyId: string;
  reading: boolean;
  running: boolean;
  onSave: (force: boolean) => Promise<void>;
}

function SaveControls({ check, ready, readyId, reading, running, onSave }: SaveProps) {
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const reasonId = useId();
  const reason = saveReason(check, reading, running);
  const failing = check !== null && !check.passed;
  const save = async (force: boolean) => {
    setBusy(true);
    setSaveError(null);
    try {
      await onSave(force);
    } catch (err) {
      setSaveError(errorText(err));
    } finally {
      setBusy(false);
    }
  };
  const describedBy = ready ? readyId : reason ? reasonId : undefined;
  return (
    <>
      {saveError && (
        <span className="alert error small" role="alert">
          {saveError}
        </span>
      )}
      {failing && !reading && <SaveAnyway count={check.problems.length} busy={busy || running} onSave={() => void save(true)} />}
      <span className="draft-save" data-tip={reason ?? undefined} data-tip-align="end">
        <button type="button" className={`btn small${ready ? ' primary' : ''}`} onClick={() => void save(false)} disabled={busy || reason !== null} aria-describedby={describedBy}>
          {busy ? 'Saving…' : 'Save to library'}
        </button>
      </span>
      {reason && (
        <span id={reasonId} className="sr-only">
          {reason}
        </span>
      )}
    </>
  );
}

export function DraftBar({ project, state, lastChange, onSave, improve, lastRun = null, reading = false, running = false }: Props) {
  const packId = project.designSystemFor ?? null;
  const { packs } = usePacks();
  const { coverage, check, error } = useDraftInfo(project.id, lastChange, lastRun?.status);
  const readyId = useId();
  if (!packId) return null;
  const name = state?.manifest?.name ?? findPack(packs, packId)?.name ?? project.name;
  const ready = Boolean(check?.passed) && improvePassed(lastRun);
  return (
    <div className="draft-bar" role="region" aria-label="Design system draft">
      {ready && (
        <span id={readyId} className="sr-only">
          The AI run passed the check. Save it to your library.
        </span>
      )}
      <DraftSummary name={name} coverage={coverage} check={check} run={lastRun} error={error} />
      <div className="draft-actions">
        {improve}
        <SaveControls check={check} ready={ready} readyId={readyId} reading={reading} running={running} onSave={(force) => onSave(name, packId, force)} />
      </div>
    </div>
  );
}
