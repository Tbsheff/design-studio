import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { AppLogLine, AppRoute, AppServerStatus, AttachedApp } from '../../shared/contracts';
import { cleanRoute, envText, parseEnvText } from '../../shared/app';
import { api, errorText } from '../api';
import { Icon } from './Icon';
import '../styles/attach-app.css';

interface AppBarProps {
  projectId: string;
  app: AttachedApp;
  onAddRoute: (route: string) => void;
}

const POLL_OPEN_MS = 1500;
const POLL_CLOSED_MS = 5000;
const STATE_TEXT: Record<AppServerStatus['state'], string> = {
  idle: 'Not started',
  starting: 'Starting',
  ready: 'Running',
  failed: 'Failed',
  stopped: 'Stopped',
};

function useAppState(projectId: string, open: boolean) {
  const [status, setStatus] = useState<AppServerStatus | null>(null);
  const [logs, setLogs] = useState<AppLogLine[]>([]);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .appState(projectId)
        .then((state) => {
          if (!alive) return;
          setStatus(state.status);
          setLogs(state.logs);
        })
        .catch(() => undefined);
    void load();
    const timer = window.setInterval(load, open ? POLL_OPEN_MS : POLL_CLOSED_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [projectId, open, tick]);
  return { status, logs, refresh: () => setTick((n) => n + 1) };
}

function RoutesTab({ projectId, onAddRoute }: { projectId: string; onAddRoute: (route: string) => void }) {
  const [routes, setRoutes] = useState<AppRoute[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [custom, setCustom] = useState('');
  useEffect(() => {
    api
      .appRoutes(projectId)
      .then((result) => setRoutes(result.routes))
      .catch((err: unknown) => setError(errorText(err)));
  }, [projectId]);
  const shown = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return (routes ?? []).filter((route) => needle === '' || route.route.toLowerCase().includes(needle) || route.file.toLowerCase().includes(needle)).slice(0, 200);
  }, [routes, filter]);
  const addCustom = (event: FormEvent) => {
    event.preventDefault();
    const route = cleanRoute(custom);
    if (!route || /[[\]]/.test(route)) return;
    onAddRoute(route);
    setCustom('');
  };
  return (
    <div className="app-routes">
      <input className="app-routes-filter" value={filter} placeholder={routes ? `Filter ${routes.length} routes` : 'Loading routes…'} aria-label="Filter routes" onChange={(e) => setFilter(e.target.value)} />
      {error && <div className="alert error small">{error}</div>}
      <div role="list" aria-label="App routes">
        {shown.map((route) => (
          <button
            key={`${route.route}|${route.file}`}
            type="button"
            role="listitem"
            className="app-route"
            title={route.dynamic ? 'Fill in the dynamic segments, then add the frame' : `Add a frame for ${route.route}`}
            onClick={() => (route.dynamic ? setCustom(route.route) : onAddRoute(route.route))}
          >
            <span>
              <span className="mono">{route.route}</span>
              <span className="file"> {route.file}</span>
            </span>
            {route.dynamic ? <span className="tag">dynamic</span> : <Icon name="plus" size={12} />}
          </button>
        ))}
      </div>
      <form className="app-route-custom" onSubmit={addCustom}>
        <input className="mono" value={custom} placeholder="/patients/123" aria-label="Route to add" onChange={(e) => setCustom(e.target.value)} />
        <button type="submit" className="btn small" disabled={!custom.trim() || /[[\]]/.test(custom)}>
          Add frame
        </button>
      </form>
    </div>
  );
}

function LogsTab({ logs }: { logs: AppLogLine[] }) {
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs.length]);
  return (
    <pre ref={ref} className="app-logs" aria-label="Dev server log">
      {logs.length === 0 ? 'No output yet.' : logs.map((line, index) => (
        <span key={index} className={line.stream}>
          {line.text}
          {'\n'}
        </span>
      ))}
    </pre>
  );
}

function SettingsTab({ projectId, app, onSaved }: { projectId: string; app: AttachedApp; onSaved: () => void }) {
  const [url, setUrl] = useState(app.url ?? '');
  const [env, setEnv] = useState(() => envText(app.env));
  const [note, setNote] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const save = (event: FormEvent) => {
    event.preventDefault();
    const parsed = parseEnvText(env);
    if (parsed.bad.length > 0) {
      setNote(`Use KEY=value lines. Not valid: ${parsed.bad[0] ?? ''}`);
      return;
    }
    setBusy(true);
    setNote(null);
    api
      .appConfig(projectId, { url: url.trim(), env: parsed.env })
      .then(() => {
        setNote('Saved. The dev server restarts.');
        onSaved();
      })
      .catch((err: unknown) => setNote(errorText(err)))
      .finally(() => setBusy(false));
  };
  return (
    <form className="app-settings" onSubmit={save}>
      <label className="field">
        <span>Dev server URL</span>
        <input className="mono" value={url} placeholder="Empty: the studio starts next dev" spellCheck={false} onChange={(e) => setUrl(e.target.value)} />
      </label>
      <label className="field">
        <span>Environment for next dev</span>
        <textarea className="mono" rows={5} value={env} placeholder="SKIP_ENV_VALIDATION=true" spellCheck={false} onChange={(e) => setEnv(e.target.value)} />
        <small className="field-help">One KEY=value per line. The studio keeps these in the project file, so do not paste secrets.</small>
      </label>
      <div className="app-settings-foot">
        {note && <span className="app-panel-sub" role="status">{note}</span>}
        <button type="submit" className="btn small primary" disabled={busy}>
          Save and restart
        </button>
      </div>
    </form>
  );
}

type Tab = 'routes' | 'logs' | 'settings';
const TABS: { id: Tab; label: string }[] = [
  { id: 'routes', label: 'Routes' },
  { id: 'logs', label: 'Log' },
  { id: 'settings', label: 'Settings' },
];

function statusLine(status: AppServerStatus | null, managed: boolean): string {
  const parts = [STATE_TEXT[status?.state ?? 'idle']];
  if (status?.upstream) parts.push(status.upstream);
  parts.push(managed ? 'started by the studio' : 'your dev server');
  if (status?.message) parts.push(status.message);
  return parts.join(' · ');
}

function ServerButtons({ state, managed, control }: { state: AppServerStatus['state']; managed: boolean; control: (action: 'start' | 'stop' | 'restart') => void }) {
  if (!managed) return null;
  const running = state === 'ready';
  return (
    <>
      {state !== 'starting' && (
        <button type="button" className="btn small" onClick={() => control(running ? 'restart' : 'start')}>
          {running ? 'Restart' : 'Start'}
        </button>
      )}
      {(running || state === 'starting') && (
        <button type="button" className="btn small ghost" onClick={() => control('stop')}>
          Stop
        </button>
      )}
    </>
  );
}

function AppPanel({ projectId, app, onAddRoute, onClose }: AppBarProps & { onClose: () => void }) {
  const [tab, setTab] = useState<Tab>('routes');
  const { status, logs, refresh } = useAppState(projectId, true);
  const state = status?.state ?? 'idle';
  const managed = app.mode === 'managed';
  const control = (action: 'start' | 'stop' | 'restart') => void api.appControl(projectId, action).then(refresh).catch(() => undefined);
  return (
    <div className="app-panel" role="dialog" aria-label="App">
      <div className="app-panel-head">
        <span className="app-status-dot" data-state={state} />
        <div className="grow">
          <div className="mono">{app.appDir === '.' ? 'App folder' : app.appDir}</div>
          <div className="app-panel-sub">{statusLine(status, managed)}</div>
        </div>
        <ServerButtons state={state} managed={managed} control={control} />
        <button type="button" className="icon-btn" aria-label="Close" onClick={onClose}>
          <Icon name="close" size={14} />
        </button>
      </div>
      <div className="app-panel-tabs segmented" role="tablist">
        {TABS.map((item) => (
          <button key={item.id} type="button" role="tab" aria-selected={tab === item.id} className={tab === item.id ? 'on' : ''} onClick={() => setTab(item.id)}>
            {item.label}
          </button>
        ))}
      </div>
      {tab === 'routes' && <RoutesTab projectId={projectId} onAddRoute={onAddRoute} />}
      {tab === 'logs' && <LogsTab logs={logs} />}
      {tab === 'settings' && <SettingsTab projectId={projectId} app={app} onSaved={refresh} />}
    </div>
  );
}

export default function AppBar({ projectId, app, onAddRoute }: AppBarProps) {
  const [open, setOpen] = useState(false);
  const { status } = useAppState(projectId, false);
  const state = status?.state ?? 'idle';
  return (
    <div className="app-bar-root">
      <button type="button" className="btn small app-bar-button" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((v) => !v)} data-tip="Routes and dev server">
        <span className="app-status-dot" data-state={state} />
        <span>{app.framework === 'next' ? 'Next.js' : 'App'}</span>
        <span className="app-panel-sub">{STATE_TEXT[state]}</span>
      </button>
      {open && <AppPanel projectId={projectId} app={app} onAddRoute={onAddRoute} onClose={() => setOpen(false)} />}
    </div>
  );
}
