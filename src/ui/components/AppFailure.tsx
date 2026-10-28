import { useEffect, useState, type FormEvent } from 'react';
import type { AppServerStatus, AttachedApp } from '../../shared/contracts';
import type { FolderInspection } from '../../shared/open-app';
import { api, errorText } from '../api';
import { CopyButton } from './CopyButton';
import { Icon } from './Icon';

interface AppFailureProps {
  projectId: string;
  app: AttachedApp;
  status: AppServerStatus;
  onRetry: () => void;
  onLog: () => void;
  onClose: () => void;
  onSaved: () => void;
}

function useInstallHint(projectId: string, app: AttachedApp, managed: boolean, retries: number): FolderInspection | null {
  const [hint, setHint] = useState<FolderInspection | null>(null);
  useEffect(() => {
    if (!managed) return;
    let live = true;
    api
      .getProject(projectId)
      .then((project) => (project.imported ? api.inspectFolder(project.imported.sourcePath, app.appDir) : null))
      .then((result) => live && setHint(result))
      .catch(() => live && setHint(null));
    return () => {
      live = false;
    };
  }, [projectId, app.appDir, managed, retries]);
  return hint;
}

function InstallFix({ hint }: { hint: FolderInspection | null }) {
  const install = hint?.install;
  if (!hint || hint.depsInstalled !== false || !install) return null;
  const full = `cd ${JSON.stringify(install.dir)} && ${install.command}`;
  return (
    <div className="app-fail-fix">
      <span className="app-fail-label">Install the dependencies in a terminal, then press Start again</span>
      <div className="app-fail-cmd">
        <code className="truncate">{full}</code>
        <CopyButton text={full} label="Copy the install command" />
      </div>
    </div>
  );
}

function UrlForm({ projectId, app, suggested, onSaved }: { projectId: string; app: AttachedApp; suggested: string; onSaved: () => void }) {
  const [url, setUrl] = useState(app.mode === 'url' ? (app.url ?? '') : suggested);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = (event: FormEvent) => {
    event.preventDefault();
    if (!url.trim()) return;
    setBusy(true);
    setError(null);
    api
      .appConfig(projectId, { url: url.trim() })
      .then(onSaved)
      .catch((err: unknown) => setError(errorText(err)))
      .finally(() => setBusy(false));
  };
  return (
    <form className="app-fail-url" onSubmit={save}>
      <label className="app-fail-label" htmlFor="app-fail-url">
        {app.mode === 'url' ? 'Dev server URL' : 'Or use a dev server you started'}
      </label>
      <div className="app-fail-url-row">
        <input id="app-fail-url" className="mono" value={url} placeholder="http://localhost:3000" spellCheck={false} autoComplete="off" onChange={(e) => setUrl(e.target.value)} />
        <button type="submit" className="btn small" disabled={busy || !url.trim()}>
          Use this URL
        </button>
      </div>
      {error && <span className="app-fail-error">{error}</span>}
    </form>
  );
}

export function AppFailure({ projectId, app, status, onRetry, onLog, onClose, onSaved }: AppFailureProps) {
  const managed = status.mode === 'managed';
  const [retries, setRetries] = useState(0);
  const hint = useInstallHint(projectId, app, managed, retries);
  const retry = () => {
    setRetries((n) => n + 1);
    onRetry();
  };
  return (
    <div className="app-fail" role="alert">
      <div className="app-fail-head">
        <Icon name="alert" size={14} />
        <strong className="grow">{managed ? 'The dev server did not start' : 'Your dev server does not answer'}</strong>
        <button type="button" className="icon-btn small" aria-label="Dismiss" data-tip="Dismiss" onClick={onClose}>
          <Icon name="close" size={12} />
        </button>
      </div>
      {status.message && <p className="app-fail-message">{status.message}</p>}
      {managed && <InstallFix hint={hint} />}
      <UrlForm projectId={projectId} app={app} suggested={/runs for this app at (\S+?)\.(?:\s|$)/.exec(status.message ?? '')?.[1] ?? ''} onSaved={onSaved} />
      <div className="app-fail-foot">
        <button type="button" className="btn small ghost" onClick={onLog}>
          {managed ? 'Show the log' : 'Show details'}
        </button>
        <span className="grow" />
        <button type="button" className="btn small primary" onClick={retry}>
          {managed ? 'Start again' : 'Check again'}
        </button>
      </div>
    </div>
  );
}
