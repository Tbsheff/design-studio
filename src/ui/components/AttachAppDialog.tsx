import { useState, type FormEvent } from 'react';
import type { AppCandidate, Project } from '../../shared/contracts';
import { parseEnvText } from '../../shared/app';
import { api, errorText } from '../api';
import { useModalDialog } from '../usePopover';
import '../styles/attach-app.css';

interface AttachAppDialogProps {
  folder: string;
  candidates: AppCandidate[];
  onAttached: (project: Project) => void;
  onClose: () => void;
}

function preferred(candidates: AppCandidate[]): string {
  return (candidates.find((candidate) => /(^|\/)(web|dashboard|app|site|frontend)$/.test(candidate.appDir)) ?? candidates[0])?.appDir ?? '';
}

export default function AttachAppDialog({ folder, candidates, onAttached, onClose }: AttachAppDialogProps) {
  const [appDir, setAppDir] = useState(() => preferred(candidates));
  const [url, setUrl] = useState('');
  const [envDraft, setEnvDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dialog = useModalDialog(() => {
    if (busy) return false;
    onClose();
  });

  const run = async (task: () => Promise<{ project: Project }>) => {
    setBusy(true);
    setError(null);
    try {
      onAttached((await task()).project);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!appDir || busy) return;
    const parsed = parseEnvText(envDraft);
    if (parsed.bad.length > 0) {
      setError(`Use KEY=value lines. Not valid: ${parsed.bad[0] ?? ''}`);
      return;
    }
    void run(() => api.attachApp({ folder, appDir, ...(url.trim() ? { url: url.trim() } : {}), env: parsed.env }));
  };

  return (
    <dialog ref={dialog.ref} className="modal attach-app-dialog" aria-label="Open an app" onMouseDown={dialog.onMouseDown}>
      <form className="modal-form" onSubmit={submit} noValidate>
        <div className="modal-head">
          <div className="titles">
            <h2>Open an app</h2>
            <p>This folder has {candidates.length} Next.js apps. The project points at your folder; nothing is copied, and edits go to your files.</p>
          </div>
        </div>
        <div className="modal-body attach-app-body">
          <fieldset className="attach-app-list">
            <legend>App</legend>
            {candidates.map((candidate) => (
              <label key={candidate.appDir} className="attach-app-option">
                <input type="radio" name="appDir" value={candidate.appDir} checked={appDir === candidate.appDir} onChange={() => setAppDir(candidate.appDir)} />
                <span className="mono">{candidate.appDir}</span>
                <span className="attach-app-name">{candidate.name}</span>
              </label>
            ))}
          </fieldset>
          <label className="field">
            <span>Dev server URL (optional)</span>
            <input className="mono" value={url} placeholder="http://localhost:3000" spellCheck={false} autoComplete="off" onChange={(e) => setUrl(e.target.value)} />
            <small className="field-help">Leave it empty and the studio starts next dev on a free port.</small>
          </label>
          <label className="field">
            <span>Environment for next dev (optional)</span>
            <textarea className="mono" rows={3} value={envDraft} placeholder="SKIP_ENV_VALIDATION=true" spellCheck={false} onChange={(e) => setEnvDraft(e.target.value)} />
            <small className="field-help">One KEY=value per line, for apps that check their env at start. Kept in the project file, so do not paste secrets.</small>
          </label>
          {error && (
            <div className="alert error small" role="alert">
              {error}
            </div>
          )}
        </div>
        <div className="modal-foot">
          <button type="button" className="btn ghost" disabled={busy} onClick={() => void run(() => api.importProject(folder, { skipApp: true }))}>
            Tokens only
          </button>
          <span className="attach-app-spacer" />
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button type="submit" className="btn primary" disabled={busy || !appDir}>
            {busy ? 'Opening…' : 'Open app'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
