import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import type { AppLogLine, AppRoute, AppServerStatus, AttachedApp, FirstVersionState } from '../../shared/contracts';
import { cleanRoute, envText, parseEnvText } from '../../shared/app';
import { api, errorText } from '../api';
import { APP_PANEL_EVENT, publishAppStatus } from '../appStatus';
import { AppFailure } from './AppFailure';
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

function useAppState(projectId: string, open: boolean, initial: AppServerStatus | null = null) {
  const [status, setStatus] = useState<AppServerStatus | null>(initial);
  const [logs, setLogs] = useState<AppLogLine[]>([]);
  const [firstVersion, setFirstVersion] = useState<FirstVersionState | null>(null);
  const [tick, setTick] = useState(0);
  const settled = status?.state === 'ready' && !firstVersion?.pending;
  useEffect(() => {
    let alive = true;
    const load = () =>
      api
        .appState(projectId)
        .then((state) => {
          if (!alive) return;
          setStatus(state.status);
          setLogs(state.logs);
          setFirstVersion(state.firstVersion ?? null);
          publishAppStatus(projectId, state.status);
        })
        .catch(() => undefined);
    void load();
    const timer = window.setInterval(load, open || !settled ? POLL_OPEN_MS : POLL_CLOSED_MS);
    return () => {
      alive = false;
      window.clearInterval(timer);
    };
  }, [projectId, open, tick, settled]);
  return { status, logs, firstVersion, refresh: () => setTick((n) => n + 1) };
}

function useSecondsSince(startedAt: number | null): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (startedAt === null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [startedAt]);
  return startedAt === null ? 0 : Math.max(0, Math.round((now - startedAt) / 1000));
}

function prepTip(firstVersion: FirstVersionState): string {
  const files = firstVersion.files ? ` of ${firstVersion.files.toLocaleString('en-US')} files` : '';
  return `Saving the first version${files} so edits can be undone. Screenshots work now; edits wait for it. About ${firstVersion.etaSeconds} s left.`;
}

function PrepChip({ firstVersion }: { firstVersion: FirstVersionState | null }) {
  const seconds = useSecondsSince(firstVersion?.pending ? firstVersion.startedAt : null);
  if (firstVersion?.error) return <span className="app-prep-chip failed" data-tip={`The first version was not saved: ${firstVersion.error}`}>Not saved</span>;
  if (!firstVersion?.pending) return null;
  return (
    <span className="app-prep-chip" role="status" data-tip={prepTip(firstVersion)}>
      Preparing… {seconds} s
    </span>
  );
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
  const matches = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return (routes ?? []).filter((route) => needle === '' || route.route.toLowerCase().includes(needle) || route.file.toLowerCase().includes(needle));
  }, [routes, filter]);
  const shown = matches.slice(0, 200);
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
            data-tip={route.dynamic ? 'Fill in the dynamic segments, then add the frame' : `Add a frame for ${route.route}`}
            data-tip-align="start"
            onClick={() => (route.dynamic ? setCustom(route.route) : onAddRoute(route.route))}
          >
            <span>
              <span className="mono">{route.route}</span>
              <span className="file"> {route.file}</span>
            </span>
            {route.dynamic ? <span className="tag">dynamic</span> : <Icon name="plus" size={12} />}
          </button>
        ))}
        {matches.length > shown.length && <div className="app-routes-more">Showing {shown.length} of {matches.length}. Type in the filter to find the rest.</div>}
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

function LogsTab({ logs, managed }: { logs: AppLogLine[]; managed: boolean }) {
  const ref = useRef<HTMLPreElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [logs.length]);
  return (
    <pre ref={ref} className="app-logs" aria-label="Dev server log">
      {!managed && <span className="studio">The studio did not start this dev server, so it cannot show its output. Look in the terminal where it runs. The studio checks are below.{'\n'}</span>}
      {logs.length === 0 ? (managed ? 'No output yet.' : '') : logs.map((line, index) => (
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

function stateText(status: AppServerStatus | null, managed: boolean): string {
  const state = status?.state ?? 'idle';
  if (managed) return STATE_TEXT[state];
  return state === 'ready' ? 'Answers' : state === 'failed' ? 'No answer' : state === 'starting' ? 'Checking' : 'Not checked';
}

function statusLine(status: AppServerStatus | null, managed: boolean): string {
  const parts = [stateText(status, managed)];
  if (status?.upstream) parts.push(status.upstream);
  parts.push(managed ? 'started by the studio' : 'your dev server');
  return parts.join(' · ');
}

function ServerButtons({ state, managed, control }: { state: AppServerStatus['state']; managed: boolean; control: (action: 'start' | 'stop' | 'restart') => void }) {
  if (!managed)
    return state === 'starting' ? null : (
      <button type="button" className="btn small" onClick={() => control('start')}>
        Check again
      </button>
    );
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

function AppPanel({ projectId, app, onAddRoute, onClose, tab, setTab, initial }: AppBarProps & { onClose: () => void; tab: Tab; setTab: (tab: Tab) => void; initial: AppServerStatus | null }) {
  const { status, logs, refresh } = useAppState(projectId, true, initial);
  const state = status?.state ?? 'idle';
  const managed = (status?.mode ?? app.mode) === 'managed';
  const control = (action: 'start' | 'stop' | 'restart') => void api.appControl(projectId, action).then(refresh).catch(() => undefined);
  return (
    <div className="app-panel" role="dialog" aria-label="App">
      <div className="app-panel-head">
        <span className="app-status-dot" data-state={state} />
        <div className="grow">
          <div className="app-panel-title">{app.appDir === '.' ? 'App folder' : <span className="mono">{app.appDir}</span>}</div>
          <div className="app-panel-sub">{statusLine(status, managed)}</div>
          {status?.message && <div className="app-panel-sub app-panel-message">{status.message}</div>}
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
      {tab === 'logs' && <LogsTab logs={logs} managed={managed} />}
      {tab === 'settings' && <SettingsTab projectId={projectId} app={app} onSaved={refresh} />}
    </div>
  );
}

function useOpenRequests(setTab: (tab: Tab) => void, setOpen: (open: boolean) => void): void {
  useEffect(() => {
    const show = (event: Event) => {
      const next = (event as CustomEvent<unknown>).detail;
      setTab(next === 'logs' || next === 'settings' ? next : 'routes');
      setOpen(true);
    };
    window.addEventListener(APP_PANEL_EVENT, show);
    return () => window.removeEventListener(APP_PANEL_EVENT, show);
  }, [setTab, setOpen]);
}

export default function AppBar({ projectId, app, onAddRoute }: AppBarProps) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('routes');
  const [hidden, setHidden] = useState<string | null>(null);
  const { status, firstVersion, refresh } = useAppState(projectId, false);
  const state = status?.state ?? 'idle';
  const managed = (status?.mode ?? app.mode) === 'managed';
  useOpenRequests(setTab, setOpen);
  const failKey = status?.state === 'failed' ? `${status.startedAt ?? 0}|${status.message ?? ''}` : null;
  const failed = failKey !== null && failKey !== hidden && !open;
  const retry = () => void api.appControl(projectId, managed ? 'restart' : 'start').then(refresh).catch(() => undefined);
  const showLog = () => {
    setTab('logs');
    setOpen(true);
  };
  return (
    <div className="app-bar-root">
      {failed && status && <AppFailure projectId={projectId} app={app} status={status} onRetry={retry} onLog={showLog} onClose={() => setHidden(failKey)} onSaved={refresh} />}
      <button type="button" className="btn small app-bar-button" aria-expanded={open} aria-haspopup="dialog" onClick={() => setOpen((v) => !v)} data-tip="Routes, dev server and log">
        <span className="app-status-dot" data-state={state} />
        <span>{app.framework === 'next' ? 'Next.js' : 'App'}</span>
        <span className="app-panel-sub">{stateText(status, managed)}</span>
        <PrepChip firstVersion={firstVersion} />
      </button>
      {open && <AppPanel projectId={projectId} app={app} onAddRoute={onAddRoute} onClose={() => setOpen(false)} tab={tab} setTab={setTab} initial={status} />}
    </div>
  );
}
