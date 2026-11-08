import type { AppServerStatus, AttachedApp } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";

import { OPEN_ROUTE_EVENT, takePendingRoute } from "../../app/project-nav.js";
import { openAppPanel, useAppStatus } from "../../platform/app-status.js";
import {
  routeFrameId,
  addRouteFrame,
  AppCanvasBar,
  useRedirectNote,
  MAX_HIDDEN_REDIRECTS,
  readHiddenRedirects,
  writeHiddenRedirects,
} from "./app-canvas-routes.js";
import type { Listen } from "./app-canvas-routes.js";
import { canAddFrame, canvasStore } from "./canvas-frames-model.js";
import type { CanvasLayout } from "./canvas-frames-model.js";
import { FrameRedirectNote } from "./canvas-frames.js";
import { copy } from "./copy.js";

const LOAD_HINT_MS = 30_000;

function reloadAppFrames(): void {
  document
    .querySelectorAll<HTMLIFrameElement>(".stage iframe.frame")
    .forEach((el) => {
      const { src } = el;

      if (src) {
        el.src = src;
      }
    });
}

function needsReload(
  prev: AppServerStatus | null,
  next: AppServerStatus | null
): boolean {
  if (!prev || next?.state !== "ready") {
    return false;
  }
  return prev.state !== "ready" || prev.upstream !== next.upstream;
}

function useServerFrames(
  status: AppServerStatus | null,
  listen: Listen,
  enabled: boolean
): boolean {
  const prev = useRef<AppServerStatus | null>(null);
  const [loaded, setLoaded] = useState(false);
  const ready = status?.state === "ready";
  useEffect(() => {
    if (enabled && needsReload(prev.current, status)) {
      setLoaded(false);
      reloadAppFrames();
    }

    prev.current = status;
  }, [status, enabled]);
  useEffect(() => {
    if (!ready) {
      setLoaded(false);
    }
  }, [ready]);
  useEffect(() => {
    if (!ready || loaded) {
      return undefined;
    }
    const timer = window.setTimeout(() => setLoaded(true), LOAD_HINT_MS);

    return () => window.clearTimeout(timer);
  }, [ready, loaded]);
  useEffect(() => {
    if (!enabled) {
      return undefined;
    }
    return listen((message) => {
      if (message.type === "ready") {
        setLoaded(true);
      }
    });
  }, [listen, enabled]);

  return loaded;
}

interface Hint {
  text: string;
  busy: boolean;
  kind: "failed" | "starting" | "loading" | "route";
}

function serverHint(
  app: AttachedApp,
  status: AppServerStatus | null,
  loaded: boolean
): Hint | null {
  const name = app.framework === "next" ? "Next.js" : "App";
  const managed = (status?.mode ?? app.mode) === "managed";
  const state = status?.state ?? "idle";

  if (state === "failed" || state === "stopped") {
    return {
      text: `${managed ? "The dev server is not running" : "Your dev server does not answer"}. Press ${name} at the bottom left for the fix.`,
      busy: false,
      kind: "failed",
    };
  }
  if (state !== "ready") {
    return {
      text: managed
        ? `Starting ${app.framework === "next" ? "next dev" : "the dev server"}…`
        : "Checking your dev server…",
      busy: true,
      kind: "starting",
    };
  }
  if (!loaded) {
    return {
      text: "Loading the page. The first visit to a route can take a while.",
      busy: true,
      kind: "loading",
    };
  }
  return null;
}

function routeHint(layout: CanvasLayout): Hint | null {
  if (layout.frames.some((frame) => frame.path !== undefined)) {
    return null;
  }
  return {
    busy: false,
    kind: "route",
    text: "This frame shows the home route. Pick the page you want to design.",
  };
}

function HintIcon({ hint }: { hint: Hint }) {
  if (hint.busy) {
    return <span className="spinner" aria-hidden="true" />;
  }
  return <Icon name={hint.kind === "route" ? "file" : "alert"} size={14} />;
}

function AppStageHint({ hint, onClose }: { hint: Hint; onClose: () => void }) {
  return (
    <div
      className="stage-message app-stage-note"
      role="status"
      data-kind={hint.kind}
    >
      <HintIcon hint={hint} />
      {hint.text}
      {hint.kind === "route" && (
        <>
          <button
            type="button"
            className="btn small"
            onClick={() => openAppPanel("routes")}
          >
            Pick a route
          </button>
          <button
            type="button"
            className="icon-btn small"
            aria-label={copy.dismiss}
            data-tip={copy.dismiss}
            onClick={onClose}
          >
            <Icon name="close" size={12} />
          </button>
        </>
      )}
    </div>
  );
}

function useRouteRequests(
  projectId: string,
  isApp: boolean,
  addRoute: (route: string) => void
): void {
  const add = useRef(addRoute);
  add.current = addRoute;
  useEffect(() => {
    if (!isApp) {
      return;
    }
    const runPending = () => {
      if (!canvasStore.loaded(projectId)) {
        return false;
      }
      const route = takePendingRoute(projectId);

      if (route) {
        add.current(route);
      }
      return true;
    };

    const unsubscribe = runPending()
      ? null
      : canvasStore.subscribe(() =>
          queueMicrotask(() => runPending() && unsubscribe?.())
        );

    const onRoute = (event: Event) => {
      const { detail } = event as CustomEvent<{
        projectId?: string;
        route?: string;
      }>;

      if (detail?.projectId === projectId && detail.route) {
        add.current(detail.route);
      }
    };

    window.addEventListener(OPEN_ROUTE_EVENT, onRoute);

    return () => {
      unsubscribe?.();
      window.removeEventListener(OPEN_ROUTE_EVENT, onRoute);
    };
  }, [projectId, isApp]);
}

interface AppCanvasInput {
  projectId: string;
  app: AttachedApp | null | undefined;
  listen: Listen;
  resetKey: string;
  frames: {
    layout: CanvasLayout;
    update: (fn: (layout: CanvasLayout) => CanvasLayout) => void;
  };
  freeze: () => void;
  focus: () => void;
  notify: (message: string) => void;
  size: { width: number; height: number };
  onSignIn: () => void;
}

function useAppCanvas(o: AppCanvasInput): {
  bar: ReactNode;
  note: ReactNode;
  stage: ReactNode;
} {
  const addRoute = (route: string) => {
    const shown = routeFrameId(o.frames.layout, route) !== null;

    if (!shown && !canAddFrame(o.frames.layout)) {
      o.notify(
        "The canvas has the most frames it can hold. Remove one to add this route."
      );

      return;
    }

    o.freeze();
    o.frames.update((layout) => addRouteFrame(layout, route, o.size));
    o.focus();
    o.notify(
      shown
        ? `${route} is already on the canvas. Showing it.`
        : `Added a frame for ${route}`
    );
  };

  useRouteRequests(o.projectId, Boolean(o.app), addRoute);
  const redirect = useRedirectNote(o.listen, Boolean(o.app), o.resetKey);
  const status = useAppStatus(o.projectId);
  const loaded = useServerFrames(status, o.listen, Boolean(o.app));
  const [routeDismissed, setRouteDismissed] = useState(false);
  const [hidden, setHidden] = useState(() => readHiddenRedirects());

  const key = redirect
    ? `${o.projectId} ${redirect.from}>${redirect.to}`
    : null;

  const shownRedirect =
    o.app && redirect && key && !hidden.includes(key) ? redirect : null;

  const hint = o.app
    ? (serverHint(o.app, status, loaded) ??
      (routeDismissed || shownRedirect ? null : routeHint(o.frames.layout)))
    : null;

  const hide = (value: string) => {
    const next = [...hidden.filter((item) => item !== value), value].slice(
      -MAX_HIDDEN_REDIRECTS
    );

    writeHiddenRedirects(next);
    setHidden(next);
  };

  const dismissRedirect = () => {
    if (key) {
      hide(key);
    }
  };

  const signIn = () => {
    dismissRedirect();
    o.onSignIn();
  };

  return {
    bar: o.app ? (
      <AppCanvasBar projectId={o.projectId} app={o.app} onAddRoute={addRoute} />
    ) : null,
    note: shownRedirect ? (
      <FrameRedirectNote
        redirect={shownRedirect}
        onSignIn={signIn}
        onDismiss={dismissRedirect}
      />
    ) : null,
    stage: hint ? (
      <AppStageHint hint={hint} onClose={() => setRouteDismissed(true)} />
    ) : null,
  };
}

export { useAppCanvas };
