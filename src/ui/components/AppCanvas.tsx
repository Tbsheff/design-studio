import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AppServerStatus, AttachedApp, BridgeToParent } from '../../shared/contracts';
import { routeLabel } from '../../shared/app';
import { cleanFrameLabel } from '../../shared/canvas-file';
import { api } from '../api';
import { openAppPanel, useAppStatus } from '../appStatus';
import { addFrame, canAddFrame, setFramePath, type CanvasLayout } from '../canvasFrames';
import { Icon } from './Icon';

const AppBar = lazy(() => import('./AppBar'));

export function routeFrameId(layout: CanvasLayout, route: string): string | null {
  const path = route.replace(/^\/+/, '').replace(/\/+$/, '');
  return layout.frames.find((frame) => (frame.path ?? '').replace(/\/+$/, '') === path)?.id ?? null;
}

export function addRouteFrame(layout: CanvasLayout, route: string, size: { width: number; height: number }): CanvasLayout {
  const path = route.replace(/^\/+/, '');
  const existing = routeFrameId(layout, route);
  if (existing) return { ...layout, activeId: existing, frames: layout.frames.map((f) => (f.id === existing && f.hidden ? withoutHidden(f) : f)) };
  if (!canAddFrame(layout)) return layout;
  const added = addFrame(layout, size);
  const frame = added.frames[added.frames.length - 1];
  if (!frame) return layout;
  const withPath = setFramePath(added, frame.id, path);
  const label = cleanFrameLabel(routeLabel(route));
  return { ...withPath, activeId: frame.id, frames: withPath.frames.map((f) => (f.id === frame.id && label ? { ...f, label } : f)) };
}

function withoutHidden(frame: CanvasLayout['frames'][number]): CanvasLayout['frames'][number] {
  const { hidden: _hidden, ...rest } = frame;
  return rest;
}

export function appRoutePages(projectId: string, app: AttachedApp | null | undefined): (() => Promise<string[]>) | null {
  if (!app) return null;
  return () => api.appRoutes(projectId).then(({ routes }) => routes.filter((route) => !route.dynamic).map((route) => route.route.replace(/^\/+/, '')));
}

export function AppCanvasBar({ projectId, app, onAddRoute }: { projectId: string; app: AttachedApp; onAddRoute: (route: string) => void }) {
  return (
    <div className="app-canvas-bar">
      <Suspense fallback={null}>
        <AppBar projectId={projectId} app={app} onAddRoute={onAddRoute} />
      </Suspense>
    </div>
  );
}

type Listen = (handler: (message: BridgeToParent) => void) => () => void;

export function useRedirectNote(listen: Listen, enabled: boolean, resetKey: string): { from: string; to: string } | null {
  const [note, setNote] = useState<{ from: string; to: string } | null>(null);
  useEffect(() => setNote(null), [resetKey]);
  useEffect(() => {
    if (!enabled) return undefined;
    return listen((message) => {
      if (message.type !== 'ready') return;
      if (!message.redirectedFrom) {
        setNote(null);
        return;
      }
      let to = message.url;
      try {
        to = new URL(message.url).pathname;
      } catch {
        to = message.url;
      }
      setNote({ from: message.redirectedFrom, to });
    });
  }, [listen, enabled]);
  return note;
}

export function RedirectNote({ note, onClose }: { note: { from: string; to: string }; onClose: () => void }) {
  const auth = /sign-?in|log-?in|auth/i.test(note.to);
  return (
    <div className="frame-redirect" role="status">
      <Icon name="alert" size={14} />
      <span>
        <strong>{note.from}</strong> sent this frame to <strong>{note.to}</strong>.{' '}
        {auth ? 'The route needs a signed-in session. Sign in inside this frame, or pick a public route.' : 'The page you see is not the route you asked for.'}
      </span>
      <button type="button" className="icon-btn" aria-label="Dismiss" onClick={onClose}>
        <Icon name="close" size={12} />
      </button>
    </div>
  );
}

const HIDDEN_REDIRECTS_KEY = 'design-studio.hidden-redirects.v1';
const MAX_HIDDEN_REDIRECTS = 50;

function readHiddenRedirects(): string[] {
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(HIDDEN_REDIRECTS_KEY) ?? '[]');
    return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writeHiddenRedirects(keys: string[]): void {
  try {
    localStorage.setItem(HIDDEN_REDIRECTS_KEY, JSON.stringify(keys));
  } catch {
    return;
  }
}

const LOAD_HINT_MS = 30_000;

function reloadAppFrames(): void {
  document.querySelectorAll<HTMLIFrameElement>('.stage iframe.frame').forEach((el) => {
    const src = el.src;
    if (src) el.src = src;
  });
}

function needsReload(prev: AppServerStatus | null, next: AppServerStatus | null): boolean {
  if (!prev || next?.state !== 'ready') return false;
  return prev.state !== 'ready' || prev.upstream !== next.upstream;
}

function useServerFrames(status: AppServerStatus | null, listen: Listen, enabled: boolean): boolean {
  const prev = useRef<AppServerStatus | null>(null);
  const [loaded, setLoaded] = useState(false);
  const ready = status?.state === 'ready';
  useEffect(() => {
    if (enabled && needsReload(prev.current, status)) {
      setLoaded(false);
      reloadAppFrames();
    }
    prev.current = status;
  }, [status, enabled]);
  useEffect(() => {
    if (!ready) setLoaded(false);
  }, [ready]);
  useEffect(() => {
    if (!ready || loaded) return undefined;
    const timer = window.setTimeout(() => setLoaded(true), LOAD_HINT_MS);
    return () => window.clearTimeout(timer);
  }, [ready, loaded]);
  useEffect(() => {
    if (!enabled) return undefined;
    return listen((message) => {
      if (message.type === 'ready') setLoaded(true);
    });
  }, [listen, enabled]);
  return loaded;
}

interface Hint {
  text: string;
  busy: boolean;
  kind: 'failed' | 'starting' | 'loading' | 'route';
}

function serverHint(app: AttachedApp, status: AppServerStatus | null, loaded: boolean): Hint | null {
  const name = app.framework === 'next' ? 'Next.js' : 'App';
  const managed = (status?.mode ?? app.mode) === 'managed';
  const state = status?.state ?? 'idle';
  if (state === 'failed' || state === 'stopped') return { text: `${managed ? 'The dev server is not running' : 'Your dev server does not answer'}. Press ${name} at the bottom left for the fix.`, busy: false, kind: 'failed' };
  if (state !== 'ready') return { text: managed ? `Starting ${app.framework === 'next' ? 'next dev' : 'the dev server'}…` : 'Checking your dev server…', busy: true, kind: 'starting' };
  if (!loaded) return { text: 'Loading the page. The first visit to a route can take a while.', busy: true, kind: 'loading' };
  return null;
}

function routeHint(layout: CanvasLayout): Hint | null {
  if (layout.frames.some((frame) => frame.path !== undefined)) return null;
  return { text: 'This frame shows the home route. Pick the page you want to design.', busy: false, kind: 'route' };
}

function HintIcon({ hint }: { hint: Hint }) {
  if (hint.busy) return <span className="spinner" aria-hidden="true" />;
  return <Icon name={hint.kind === 'route' ? 'file' : 'alert'} size={14} />;
}

function AppStageHint({ hint, onClose }: { hint: Hint; onClose: () => void }) {
  return (
    <div className="stage-message app-stage-note" role="status" data-kind={hint.kind}>
      <HintIcon hint={hint} />
      {hint.text}
      {hint.kind === 'route' && (
        <>
          <button type="button" className="btn small" onClick={() => openAppPanel('routes')}>
            Pick a route
          </button>
          <button type="button" className="icon-btn small" aria-label="Dismiss" data-tip="Dismiss" onClick={onClose}>
            <Icon name="close" size={12} />
          </button>
        </>
      )}
    </div>
  );
}

interface AppCanvasInput {
  projectId: string;
  app: AttachedApp | null | undefined;
  listen: Listen;
  resetKey: string;
  frames: { layout: CanvasLayout; update: (fn: (layout: CanvasLayout) => CanvasLayout) => void };
  freeze: () => void;
  focus: () => void;
  notify: (message: string) => void;
  size: { width: number; height: number };
}

export function useAppCanvas(o: AppCanvasInput): { bar: ReactNode; note: ReactNode; stage: ReactNode } {
  const addRoute = (route: string) => {
    const shown = routeFrameId(o.frames.layout, route) !== null;
    if (!shown && !canAddFrame(o.frames.layout)) {
      o.notify('The canvas has the most frames it can hold. Remove one to add this route.');
      return;
    }
    o.freeze();
    o.frames.update((layout) => addRouteFrame(layout, route, o.size));
    o.focus();
    o.notify(shown ? `${route} is already on the canvas. Showing it.` : `Added a frame for ${route}`);
  };
  const redirect = useRedirectNote(o.listen, Boolean(o.app), o.resetKey);
  const status = useAppStatus(o.projectId);
  const loaded = useServerFrames(status, o.listen, Boolean(o.app));
  const [routeDismissed, setRouteDismissed] = useState(false);
  const hint = o.app ? (serverHint(o.app, status, loaded) ?? (routeDismissed ? null : routeHint(o.frames.layout))) : null;
  const [hidden, setHidden] = useState(() => readHiddenRedirects());
  const key = redirect ? `${o.projectId} ${redirect.from}>${redirect.to}` : null;
  const hide = (value: string) => {
    const next = [...hidden.filter((item) => item !== value), value].slice(-MAX_HIDDEN_REDIRECTS);
    writeHiddenRedirects(next);
    setHidden(next);
  };
  return {
    bar: o.app ? <AppCanvasBar projectId={o.projectId} app={o.app} onAddRoute={addRoute} /> : null,
    note: redirect && key && !hidden.includes(key) ? <RedirectNote note={redirect} onClose={() => hide(key)} /> : null,
    stage: hint ? <AppStageHint hint={hint} onClose={() => setRouteDismissed(true)} /> : null,
  };
}
