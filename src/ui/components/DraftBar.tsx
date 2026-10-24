import { useEffect, useState, type ReactNode } from 'react';
import type { CoverageGrade, DesignSystemCoverage, DesignSystemState, Project } from '../../shared/contracts';
import { api, errorText } from '../api';
import { findPack, usePacks } from '../packs';

const GRADE_LABELS: Record<CoverageGrade, string> = {
  excellent: 'Excellent',
  usable: 'Usable',
  'needs-review': 'Needs review',
  rebuild: 'Rebuild',
};

const SHOWN_FALLBACKS = 6;

function useDraftCoverage(projectId: string, lastChange: unknown): { coverage: DesignSystemCoverage | null; error: string | null } {
  const [state, setState] = useState<{ coverage: DesignSystemCoverage | null; error: string | null }>({ coverage: null, error: null });
  useEffect(() => {
    let live = true;
    api
      .getDesignSystemDraft(projectId)
      .then((info) => live && setState({ coverage: info.coverage, error: null }))
      .catch((err) => live && setState({ coverage: null, error: errorText(err) }));
    return () => {
      live = false;
    };
  }, [projectId, lastChange]);
  return state;
}

function cssVarOf(token: string): string {
  const [group, name] = token.split('.');
  return group === 'color' ? `--${name}` : `--${group}-${name}`;
}

function Fallbacks({ tokens }: { tokens: string[] }) {
  if (tokens.length === 0) return <span className="draft-fallbacks">No fallback tokens</span>;
  const shown = tokens.slice(0, SHOWN_FALLBACKS);
  const more = tokens.length - shown.length;
  return (
    <span className="draft-fallbacks" title={tokens.join(', ')}>
      From base: {shown.map(cssVarOf).join(', ')}
      {more > 0 ? ` +${more} more` : ''}
    </span>
  );
}

interface Props {
  project: Project;
  state: DesignSystemState | null;
  lastChange: unknown;
  onSave: (name: string, packId: string) => Promise<void>;
  improve?: ReactNode;
}

export function DraftBar({ project, state, lastChange, onSave, improve }: Props) {
  const packId = project.designSystemFor ?? null;
  const { packs } = usePacks();
  const { coverage, error } = useDraftCoverage(project.id, lastChange);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
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

  return (
    <div className="draft-bar" role="region" aria-label="Design system draft">
      <div className="draft-main">
        <strong className="truncate">{name}</strong>
        {coverage && (
          <span className={`draft-grade grade-${coverage.grade}`} aria-label={`Coverage ${coverage.score} of 100, ${GRADE_LABELS[coverage.grade]}`}>
            {GRADE_LABELS[coverage.grade]} · {coverage.score}/100
          </span>
        )}
        {coverage && <Fallbacks tokens={coverage.fallbacks} />}
        {error && <span className="draft-fallbacks">Could not load coverage. {error}</span>}
      </div>
      <div className="draft-actions">
        {saveError && (
          <span className="alert error small" role="alert">
            {saveError}
          </span>
        )}
        {improve}
        <button type="button" className="btn primary small" onClick={() => void save()} disabled={busy}>
          {busy ? 'Saving…' : 'Save to library'}
        </button>
      </div>
    </div>
  );
}
