import { useEffect, useId, useState, type ReactNode } from 'react';
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

interface Props {
  project: Project;
  state: DesignSystemState | null;
  lastChange: unknown;
  onSave: (name: string, packId: string) => Promise<void>;
  improve?: ReactNode;
  lastRun?: RunView | null;
}

export function DraftBar({ project, state, lastChange, onSave, improve, lastRun = null }: Props) {
  const packId = project.designSystemFor ?? null;
  const { packs } = usePacks();
  const { coverage, check, error } = useDraftInfo(project.id, lastChange, lastRun?.status);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const readyId = useId();
  if (!packId) return null;
  const name = state?.manifest?.name ?? findPack(packs, packId)?.name ?? project.name;

  const save = async () => {
    setBusy(true);
    setSaveError(null);
    try {
      await onSave(name, packId);
    } catch (err) {
      setSaveError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const ready = Boolean(check?.passed) && improvePassed(lastRun);
  return (
    <div className="draft-bar" role="region" aria-label="Design system draft">
      {ready && (
        <span id={readyId} className="sr-only">
          The AI run passed the check. Save it to your library.
        </span>
      )}
      <div className="draft-main">
        <strong className="truncate">{name}</strong>
        {coverage && (
          <span className={`draft-grade grade-${coverage.grade}`} aria-label={`Coverage ${coverage.score} of 100, ${GRADE_LABELS[coverage.grade]}`}>
            {GRADE_LABELS[coverage.grade]} · {coverage.score}/100
          </span>
        )}
        {coverage && <Fallbacks tokens={coverage.fallbacks} />}
        <CheckStatus check={check} run={lastRun} />
        {error && <span className="draft-fallbacks">Could not load coverage. {error}</span>}
      </div>
      <div className="draft-actions">
        {saveError && (
          <span className="alert error small" role="alert">
            {saveError}
          </span>
        )}
        {improve}
        <button type="button" className={`btn small${ready ? ' primary' : ''}`} onClick={() => void save()} disabled={busy} aria-describedby={ready ? readyId : undefined}>
          {busy ? 'Saving…' : 'Save to library'}
        </button>
      </div>
    </div>
  );
}
