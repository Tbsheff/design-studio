import { useEffect, useState } from 'react';
import type { LayoutFinding, RenderCheckResult } from '../../shared/contracts';
import { consoleKey, keyCounts, layoutKey, takeKey, type FinalCheckWithBaseline } from '../../shared/final-check-baseline';
import { api } from '../api';
import { Icon } from './Icon';

interface Props {
  projectId: string;
  results: RenderCheckResult[] | null;
  error: string | null;
  onClose: () => void;
}

function CheckScreenshot({ projectId, filePath, label }: { projectId: string; filePath: string; label: string }) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let alive = true;
    let objectUrl: string | null = null;
    api
      .projectFile(projectId, filePath)
      .then((blob) => {
        if (!alive) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [projectId, filePath]);
  if (failed) return <div className="muted small-text">Screenshot not available</div>;
  if (!src) return null;
  return <img className="check-shot" src={src} alt={`${label} render check screenshot`} />;
}

const SHOT_SUFFIX = /-(?:desktop|tablet|mobile)\.png$/;

function directionOf(results: RenderCheckResult[] | null): string | null {
  const shot = results?.find((r) => r.screenshotPath)?.screenshotPath;
  const name = shot?.split(/[\\/]/).pop() ?? '';
  return SHOT_SUFFIX.test(name) ? name.replace(SHOT_SUFFIX, '') : null;
}

function useOldKeys(projectId: string, results: RenderCheckResult[] | null): string[] | null {
  const [keys, setKeys] = useState<string[] | null>(null);
  const did = directionOf(results);
  useEffect(() => {
    let alive = true;
    setKeys(null);
    if (!did) return;
    api
      .listRuns(projectId)
      .then((runs) => {
        const run = runs.find((r) => r.directionId === did && (r.finalCheck as FinalCheckWithBaseline | undefined)?.baseline);
        if (alive) setKeys((run?.finalCheck as FinalCheckWithBaseline | undefined)?.baseline?.keys ?? null);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [projectId, did, results]);
  return keys;
}

interface ShownResult {
  result: RenderCheckResult;
  problems: string[];
  layout: LayoutFinding[];
  overflow: boolean;
}

function hideOld(results: RenderCheckResult[] | null, keys: string[] | null): { shown: ShownResult[]; hidden: number } {
  const counts = keyCounts(keys ?? []);
  let hidden = 0;
  const keep = (key: string) => {
    const old = takeKey(counts, `error|${key}`);
    if (old) hidden += 1;
    return !old;
  };
  const shown = (results ?? []).map((result) => ({
    result,
    problems: [...result.pageErrors, ...result.consoleErrors].filter((p) => keep(consoleKey(result.viewport, p))),
    layout: (result.layout ?? []).filter((f) => f.severity !== 'error' || keep(layoutKey(result.viewport, f))),
    overflow: result.horizontalOverflow && keep(`${result.viewport}|overflow`),
  }));
  return { shown, hidden };
}

export function RenderCheckPanel({ projectId, results, error, onClose }: Props) {
  const { shown, hidden } = hideOld(results, useOldKeys(projectId, results));
  return (
    <div className="check-panel" role="region" aria-label="Render check results">
      <div className="check-head">
        <Icon name="scan" />
        <strong>Render check</strong>
        <div className="spacer" />
        <button className="icon-btn" aria-label="Close" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <div className="check-body">
        {error && <div className="alert error">{error}</div>}
        {hidden > 0 && (
          <div className="muted small-text" data-tip="Findings the page had before the last run started">
            {hidden} old, hidden
          </div>
        )}
        {shown.map(({ result: r, problems, layout, overflow }) => {
          const ok = problems.length === 0 && !overflow;
          const layoutTotal = Math.max(layout.length, (r.layoutTotal ?? 0) - ((r.layout ?? []).length - layout.length));
          return (
            <div key={`${r.viewport}-${r.width}`} className="check-row">
              <div className="row">
                <span className={`badge ${ok ? 'ok' : 'fail'}`}>{ok ? 'Pass' : 'Fail'}</span>
                <span>{r.viewport === 'desktop' ? 'Desktop' : r.viewport === 'tablet' ? 'Tablet' : 'Mobile'}</span>
                <span className="muted num">
                  {r.width} × {r.height}
                </span>
                {overflow && <span className="badge warn">Horizontal overflow</span>}
                {layout.length > 0 && <span className="badge warn">{layoutTotal} layout {layoutTotal === 1 ? 'issue' : 'issues'}</span>}
              </div>
              {layout.length > 0 && (
                <ul className="check-errors check-layout">
                  {layout.map((f, i) => (
                    <li key={i}>
                      <strong>{f.kind}</strong> <code>{f.source ?? f.selector}</code>: {f.detail}
                    </li>
                  ))}
                </ul>
              )}
              {problems.length > 0 && (
                <ul className="check-errors">
                  {problems.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              )}
              {r.screenshotPath && (
                <CheckScreenshot
                  projectId={projectId}
                  filePath={r.screenshotPath}
                  label={r.viewport === 'desktop' ? 'Desktop' : r.viewport === 'tablet' ? 'Tablet' : 'Mobile'}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
