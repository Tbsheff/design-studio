import { useEffect, useState } from 'react';
import type { RenderCheckResult } from '../../shared/contracts';
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

export function RenderCheckPanel({ projectId, results, error, onClose }: Props) {
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
        {results?.map((r) => {
          const problems = [...r.pageErrors, ...r.consoleErrors];
          return (
            <div key={`${r.viewport}-${r.width}`} className="check-row">
              <div className="row">
                <span className={`badge ${r.ok ? 'ok' : 'fail'}`}>{r.ok ? 'Pass' : 'Fail'}</span>
                <span>{r.viewport === 'desktop' ? 'Desktop' : 'Mobile'}</span>
                <span className="muted num">
                  {r.width} × {r.height}
                </span>
                {r.horizontalOverflow && <span className="badge warn">Horizontal overflow</span>}
                {r.layout?.length > 0 && <span className="badge warn">{r.layoutTotal} layout {r.layoutTotal === 1 ? 'issue' : 'issues'}</span>}
              </div>
              {r.layout?.length > 0 && (
                <ul className="check-errors check-layout">
                  {r.layout.map((f, i) => (
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
                  label={r.viewport === 'desktop' ? 'Desktop' : 'Mobile'}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
