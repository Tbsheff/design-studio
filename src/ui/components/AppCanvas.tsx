import { lazy, Suspense, useEffect, useRef, useState, type ReactNode } from 'react';
import type { AppServerStatus, AttachedApp, BridgeToParent } from '../../shared/contracts';
import { routeLabel } from '../../shared/app';
import { cleanFrameLabel } from '../../shared/canvas-file';
import { api } from '../api';
import { useAppStatus } from '../appStatus';
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
    if (!enabled) return undefined;
    return listen((message) => {
      if (message.type === 'ready') setLoaded(true);
    });
  }, [listen, enabled]);
  return loaded;
}

function serverHint(app: AttachedApp, status: AppServerStatus | null, loaded: boolean): { text: string; busy: boolean } | null {
  const name = app.framework === 'next' ? 'Next.js' : 'App';
  const managed = (status?.mode ?? app.mode) === 'managed';
  const state = status?.state ?? 'idle';
  if (state === 'failed' || state === 'stopped') return { text: `${managed ? 'The dev server is not running' : 'Your dev server does not answer'}. Press ${name} at the bottom left for the fix.`, busy: false };
  if (state !== 'ready') return { text: managed ? `Starting ${app.framework === 'next' ? 'next dev' : 'the dev server'}…` : 'Checking your dev server…', busy: true };
  if (!loaded) return { text: 'Loading the page. The first visit to a route can take a while.', busy: true };
  return null;
}

function AppStageHint({ hint }: { hint: { text: string; busy: boolean } }) {
  return (
    <div className="stage-message app-stage-note" role="status">
      {hint.busy ? <span className="spinner" aria-hidden="true" /> : <Icon name="alert" size={14} />}
      {hint.text}
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
  const hint = o.app ? serverHint(o.app, status, loaded) : null;
  const [hidden, setHidden] = useState<string | null>(null);
  const key = redirect ? `${redirect.from}>${redirect.to}` : null;
  return {
    bar: o.app ? <AppCanvasBar projectId={o.projectId} app={o.app} onAddRoute={addRoute} /> : null,
    note: redirect && key !== hidden ? <RedirectNote note={redirect} onClose={() => setHidden(key)} /> : null,
    stage: hint ? <AppStageHint hint={hint} /> : null,
  };
}
