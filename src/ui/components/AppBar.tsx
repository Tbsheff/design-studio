import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { AppLogLine, AppRoute, AppServerStatus, AttachedApp } from '../../shared/contracts';
import { cleanRoute } from '../../shared/app';
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

export default function AppBar({ projectId, app, onAddRoute }: AppBarProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<'routes' | 'logs'>('routes');
  const { status, logs, refresh } = useAppState(projectId, open);
  const state = status?.state ?? 'idle';
  const control = (action: 'start' | 'stop' | 'restart') => void api.appControl(projectId, action).then(refresh).catch(() => undefined);
  const managed = app.mode === 'managed';
  return (
    <div className="app-bar-root">
      <button type="button" className="btn small app-bar-button" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((v) => !v)} data-tip="Routes and dev server">
        <span className="app-status-dot" data-state={state} />
        <span>{app.framework === 'next' ? 'Next.js' : 'App'}</span>
        <span className="app-panel-sub">{STATE_TEXT[state]}</span>
      </button>
      {open && (
        <div className="app-panel" role="dialog" aria-label="App">
          <div className="app-panel-head">
            <span className="app-status-dot" data-state={state} />
            <div className="grow">
              <div className="mono">{app.appDir === '.' ? 'App folder' : app.appDir}</div>
              <div className="app-panel-sub">
                {STATE_TEXT[state]}
                {status?.upstream ? ` · ${status.upstream}` : ''}
                {managed ? ' · started by the studio' : ' · your dev server'}
                {status?.message ? ` · ${status.message}` : ''}
              </div>
            </div>
            {managed && state !== 'starting' && (
              <button type="button" className="btn small" onClick={() => control(state === 'ready' ? 'restart' : 'start')}>
                {state === 'ready' ? 'Restart' : 'Start'}
              </button>
            )}
            {managed && (state === 'ready' || state === 'starting') && (
              <button type="button" className="btn small ghost" onClick={() => control('stop')}>
                Stop
              </button>
            )}
            <button type="button" className="icon-btn" aria-label="Close" onClick={() => setOpen(false)}>
              <Icon name="close" size={14} />
            </button>
          </div>
          <div className="app-panel-tabs segmented" role="tablist">
            <button type="button" role="tab" aria-selected={tab === 'routes'} className={tab === 'routes' ? 'on' : ''} onClick={() => setTab('routes')}>
              Routes
            </button>
            <button type="button" role="tab" aria-selected={tab === 'logs'} className={tab === 'logs' ? 'on' : ''} onClick={() => setTab('logs')}>
              Log
            </button>
          </div>
          {tab === 'routes' ? <RoutesTab projectId={projectId} onAddRoute={onAddRoute} /> : <LogsTab logs={logs} />}
        </div>
      )}
    </div>
  );
}
