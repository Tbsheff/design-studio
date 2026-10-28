import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { Project } from '../../shared/contracts';
import { parseEnvText } from '../../shared/app';
import { shortenHome, type WorkspaceList } from '../../shared/folders';
import type { FolderInspection } from '../../shared/open-app';
import { api, errorText } from '../api';
import { hasNativePicker, pickFolder } from '../folderPicker';
import { CopyButton } from './CopyButton';
import { Icon } from './Icon';
import '../styles/attach-app.css';
import '../styles/open-app.css';

const INSPECT_DELAY_MS = 250;
const MAX_RECENTS = 6;
const KIND_TEXT: Record<NonNullable<FolderInspection['kind']>, string> = {
  next: 'Next.js app',
  vite: 'Vite app',
  html: 'HTML pages',
  tokens: 'App with design tokens',
};

type RunMode = 'start' | 'url';

interface Recent {
  path: string;
  label: string;
  attached: boolean;
}

export interface OpenAppPanelProps {
  initialPath: string;
  projects: Project[] | null;
  workspaces: WorkspaceList | null;
  onOpen: (projectId: string) => void;
}

function recentFolders(projects: Project[] | null, workspaces: WorkspaceList | null): Recent[] {
  const seen = new Set<string>();
  const out: Recent[] = [];
  const add = (path: string, label: string, attached: boolean) => {
    if (seen.has(path) || out.length >= MAX_RECENTS) return;
    seen.add(path);
    out.push({ path, label, attached });
  };
  const opened = (projects ?? []).filter((project) => project.imported && !project.imported.created && !project.designSystemFor);
  for (const project of [...opened].sort((a, b) => Number(Boolean(b.app)) - Number(Boolean(a.app)))) if (project.imported) add(project.imported.sourcePath, project.name, Boolean(project.app));
  for (const folder of workspaces?.folders ?? []) if (!folder.default && !folder.missing) add(folder.path, folder.label, false);
  return out;
}

function useInspection(path: string, appDir: string | null, nonce: number) {
  const [result, setResult] = useState<FolderInspection | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    const value = path.trim();
    setError(null);
    if (!value) {
      setResult(null);
      setChecking(false);
      return;
    }
    let live = true;
    setChecking(true);
    const timer = window.setTimeout(() => {
      api
        .inspectFolder(value, appDir ?? undefined)
        .then((next) => live && setResult(next))
        .catch((err: unknown) => live && setError(errorText(err)))
        .finally(() => live && setChecking(false));
    }, INSPECT_DELAY_MS);
    return () => {
      live = false;
      window.clearTimeout(timer);
    };
  }, [path, appDir, nonce]);
  return { result: path.trim() ? result : null, checking, error };
}

function StatusLine({ path, checking, error, result }: { path: string; checking: boolean; error: string | null; result: FolderInspection | null }) {
  if (!path.trim()) return <p className="open-app-status">A Next.js app, a Vite app, or a folder with an index.html. The studio edits the files in place.</p>;
  if (checking && !result) return <p className="open-app-status">Checking the folder…</p>;
  const problem = error ?? result?.problem ?? null;
  if (problem) return <p className="open-app-status" data-tone="error" role="alert">{problem}</p>;
  if (!result?.kind) return null;
  const where = result.kind === 'next' && result.appDir && result.appDir !== '.' ? ` in ${result.appDir}` : '';
  const known = result.projectId ? ' · already a project' : '';
  return (
    <p className="open-app-status" data-tone="ok">
      <Icon name="check" size={12} /> {KIND_TEXT[result.kind]}{where}{known} · <span className="mono">{result.path}</span>
    </p>
  );
}

function RecentList({ recents, homeDir, onPick }: { recents: Recent[]; homeDir: string | null; onPick: (path: string) => void }) {
  if (recents.length === 0) return null;
  return (
    <div className="open-app-recents ui-menu-section" role="group" aria-label="Recent folders">
      <div className="ui-menu-label">Recent folders</div>
      {recents.map((recent) => (
        <button key={recent.path} type="button" className="ui-menu-item open-app-recent" onClick={() => onPick(recent.path)} data-tip={recent.path} data-tip-align="start">
          <Icon name={recent.attached ? 'code' : 'folder'} size={14} />
          <span className="truncate">{recent.label}</span>
          <span className="ui-menu-meta mono truncate">{shortenHome(recent.path, homeDir)}</span>
        </button>
      ))}
    </div>
  );
}

function InstallNote({ result, onRecheck }: { result: FolderInspection; onRecheck: () => void }) {
  const install = result.install;
  if (result.depsInstalled !== false || !install) return null;
  const full = `cd ${JSON.stringify(install.dir)} && ${install.command}`;
  return (
    <div className="open-app-install" role="status">
      <Icon name="alert" size={14} />
      <div className="grow">
        <div>
          The app's dependencies are not installed, so next dev cannot start. Run <code>{install.command}</code> in <span className="mono">{install.dir}</span>, then check again.
        </div>
        <div className="open-app-install-cmd">
          <code className="truncate">{full}</code>
          <CopyButton text={full} label="Copy the install command" />
        </div>
      </div>
      <button type="button" className="btn small" onClick={onRecheck}>
        Check again
      </button>
    </div>
  );
}

interface NextOptionsProps {
  result: FolderInspection;
  appDir: string | null;
  onAppDir: (dir: string) => void;
  mode: RunMode;
  onMode: (mode: RunMode) => void;
  url: string;
  onUrl: (url: string) => void;
  env: string;
  onEnv: (env: string) => void;
  onRecheck: () => void;
}

function NextOptions(p: NextOptionsProps) {
  const chosen = p.appDir ?? p.result.appDir;
  return (
    <div className="open-app-options">
      {p.result.candidates.length > 1 && (
        <fieldset className="attach-app-list">
          <legend>This folder has {p.result.candidates.length} Next.js apps. Pick one.</legend>
          {p.result.candidates.map((candidate) => (
            <label key={candidate.appDir} className="attach-app-option">
              <input type="radio" name="appDir" value={candidate.appDir} checked={chosen === candidate.appDir} onChange={() => p.onAppDir(candidate.appDir)} />
              <span className="mono">{candidate.appDir}</span>
              <span className="attach-app-name">{candidate.name}</span>
            </label>
          ))}
        </fieldset>
      )}
      <div className="open-app-run">
        <span className="open-app-label">Dev server</span>
        <div className="segmented" role="radiogroup" aria-label="Dev server">
          <button type="button" role="radio" aria-checked={p.mode === 'start'} className={p.mode === 'start' ? 'on' : ''} onClick={() => p.onMode('start')}>
            Start next dev for me
          </button>
          <button type="button" role="radio" aria-checked={p.mode === 'url'} className={p.mode === 'url' ? 'on' : ''} onClick={() => p.onMode('url')}>
            Use my running server
          </button>
        </div>
      </div>
      {p.mode === 'url' ? (
        <label className="field">
          <span>Dev server URL</span>
          <input className="mono" value={p.url} placeholder="http://localhost:3000" spellCheck={false} autoComplete="off" autoFocus onChange={(e) => p.onUrl(e.target.value)} />
          <small className="field-help">The studio checks that something answers there. It cannot show the log of a server it did not start.</small>
        </label>
      ) : (
        <InstallNote result={p.result} onRecheck={p.onRecheck} />
      )}
      <details className="open-app-env">
        <summary>Environment for next dev (optional)</summary>
        <textarea className="mono" rows={3} value={p.env} placeholder="SKIP_ENV_VALIDATION=true" spellCheck={false} aria-label="Environment for next dev" onChange={(e) => p.onEnv(e.target.value)} />
        <small className="field-help">One KEY=value per line. The studio keeps these in the project file, so do not paste secrets.</small>
      </details>
    </div>
  );
}

function submitLabel(result: FolderInspection | null, busy: boolean): string {
  if (busy) return 'Opening…';
  if (result?.projectId && result.kind !== 'next') return 'Open project';
  return result?.kind === 'next' ? 'Open app' : 'Open folder';
}

function attachInput(result: FolderInspection, appDir: string | null, mode: RunMode, url: string, env: string) {
  const parsed = parseEnvText(env);
  if (parsed.bad.length > 0) return { error: `Use KEY=value lines. Not valid: ${parsed.bad[0] ?? ''}` };
  if (mode === 'url' && !url.trim()) return { error: 'Type the URL of your running dev server, or let the studio start next dev.' };
  const dir = appDir ?? result.appDir ?? '.';
  return { request: { folder: result.path, appDir: dir, ...(mode === 'url' ? { url: url.trim() } : {}), env: parsed.env } };
}

export default function OpenAppPanel({ initialPath, projects, workspaces, onOpen }: OpenAppPanelProps) {
  const [path, setPath] = useState(initialPath);
  const [appDir, setAppDir] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const [mode, setMode] = useState<RunMode>('start');
  const [url, setUrl] = useState('');
  const [env, setEnv] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { result, checking, error: inspectError } = useInspection(path, appDir, nonce);
  const recents = useMemo(() => recentFolders(projects, workspaces), [projects, workspaces]);
  const native = hasNativePicker();
  useEffect(() => setPath(initialPath), [initialPath]);
  useEffect(() => setAppDir(null), [path]);

  const takePath = (next: string) => {
    setPath(next);
    setError(null);
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };
  const choose = async () => {
    const picked = await pickFolder({ title: 'Choose your app folder', ...(path.trim() ? { defaultPath: path.trim() } : {}) });
    if (picked.kind === 'picked') takePath(picked.path);
  };
  const run = async (task: () => Promise<{ project: Project }>) => {
    setBusy(true);
    setError(null);
    try {
      onOpen((await task()).project.id);
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (busy || !result?.kind || result.problem) return;
    if (result.kind !== 'next') {
      if (result.projectId) onOpen(result.projectId);
      else void run(() => api.importProject(result.path, { skipApp: true }));
      return;
    }
    const input = attachInput(result, appDir, mode, url, env);
    if ('error' in input) {
      setError(input.error ?? null);
      return;
    }
    void run(() => api.attachApp(input.request));
  };
  const ready = Boolean(result?.kind) && !result?.problem && !checking;
  return (
    <form className="open-app" onSubmit={submit} aria-label="Open your app" noValidate>
      <label className="open-app-label" htmlFor="open-app-path">
        App folder
      </label>
      <div className="open-app-row">
        <Icon name="folder" size={16} />
        <input id="open-app-path" ref={inputRef} className="mono" value={path} placeholder="/Users/you/code/my-app" spellCheck={false} autoComplete="off" autoFocus onChange={(e) => takePath(e.target.value)} />
        {native && (
          <button type="button" className="btn small" onClick={() => void choose()}>
            Choose…
          </button>
        )}
      </div>
      <StatusLine path={path} checking={checking} error={inspectError} result={result} />
      {result?.kind === 'next' && !result.problem && (
        <NextOptions result={result} appDir={appDir} onAppDir={setAppDir} mode={mode} onMode={setMode} url={url} onUrl={setUrl} env={env} onEnv={setEnv} onRecheck={() => setNonce((n) => n + 1)} />
      )}
      {!ready && <RecentList recents={recents.filter((recent) => recent.path !== result?.path)} homeDir={workspaces?.homeDir ?? null} onPick={takePath} />}
      {error && (
        <div className="alert error small" role="alert">
          {error}
        </div>
      )}
      <div className="open-app-foot">
        <span className="open-app-note">Nothing is copied. Edits go to the files in this folder.</span>
        {result?.kind === 'next' && (
          <button type="button" className="btn ghost small" disabled={busy || !ready} data-tip="Read the design tokens only. No dev server." onClick={() => result && void run(() => api.importProject(result.path, { skipApp: true }))}>
            Tokens only
          </button>
        )}
        <button type="submit" className="btn primary" disabled={busy || !ready}>
          {submitLabel(result, busy)}
        </button>
      </div>
    </form>
  );
}
