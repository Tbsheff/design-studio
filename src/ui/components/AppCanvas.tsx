import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import type { AttachedApp, BridgeToParent } from '../../shared/contracts';
import { routeLabel } from '../../shared/app';
import { cleanFrameLabel } from '../../shared/canvas-file';
import { api } from '../api';
import { addFrame, canAddFrame, setFramePath, type CanvasLayout } from '../canvasFrames';
import { Icon } from './Icon';

const AppBar = lazy(() => import('./AppBar'));

export function addRouteFrame(layout: CanvasLayout, route: string, size: { width: number; height: number }): CanvasLayout {
  if (!canAddFrame(layout)) return layout;
  const added = addFrame(layout, size);
  const frame = added.frames[added.frames.length - 1];
  if (!frame) return layout;
  const withPath = setFramePath(added, frame.id, route.replace(/^\/+/, ''));
  const label = cleanFrameLabel(routeLabel(route));
  return { ...withPath, activeId: frame.id, frames: withPath.frames.map((f) => (f.id === frame.id && label ? { ...f, label } : f)) };
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

interface AppCanvasInput {
  projectId: string;
  app: AttachedApp | null | undefined;
  listen: Listen;
  resetKey: string;
  frames: { update: (fn: (layout: CanvasLayout) => CanvasLayout) => void };
  freeze: () => void;
  size: { width: number; height: number };
}

export function useAppCanvas(o: AppCanvasInput): { bar: ReactNode; note: ReactNode } {
  const addRoute = (route: string) => {
    o.freeze();
    o.frames.update((layout) => addRouteFrame(layout, route, o.size));
  };
  const redirect = useRedirectNote(o.listen, Boolean(o.app), o.resetKey);
  const [hidden, setHidden] = useState<string | null>(null);
  const key = redirect ? `${redirect.from}>${redirect.to}` : null;
  return {
    bar: o.app ? <AppCanvasBar projectId={o.projectId} app={o.app} onAddRoute={addRoute} /> : null,
    note: redirect && key !== hidden ? <RedirectNote note={redirect} onClose={() => setHidden(key)} /> : null,
  };
}
