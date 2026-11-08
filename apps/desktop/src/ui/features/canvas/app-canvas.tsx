import type { AppServerStatus, AttachedApp } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useEffect, useRef, useState } from "react";
import type { ReactNode, ReactElement } from "react";

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

const reloadAppFrames = (): void => {
  document
    .querySelectorAll<HTMLIFrameElement>(".stage iframe.frame")
    .forEach((el) => {
      const { src } = el;

      if (src) {
        el.src = src;
      }
    });
};

const needsReload = (
  prev: AppServerStatus | null,
  next: AppServerStatus | null
): boolean => {
  if (!prev || next?.state !== "ready") {
    return false;
  }

  return prev.state !== "ready" || prev.upstream !== next.upstream;
};

const useServerFrames = (
  status: AppServerStatus | null,
  listen: Listen,
  enabled: boolean
): boolean => {
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

    return (): void => window.clearTimeout(timer);
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
};

interface Hint {
  text: string;
  busy: boolean;
  kind: "failed" | "starting" | "loading" | "route";
}

const serverHint = (
  app: AttachedApp,
  status: AppServerStatus | null,
  loaded: boolean
): Hint | null => {
  const name = app.framework === "next" ? "Next.js" : "App";
  const managed = (status?.mode ?? app.mode) === "managed";
  const state = status?.state ?? "idle";

  if (state === "failed" || state === "stopped") {
    return {
      busy: false,
      kind: "failed",
      text: `${managed ? "The dev server is not running" : "Your dev server does not answer"}. Press ${name} at the bottom left for the fix.`,
    };
  }

  if (state !== "ready") {
    return {
      busy: true,
      kind: "starting",
      text: managed
        ? `Starting ${app.framework === "next" ? "next dev" : "the dev server"}…`
        : "Checking your dev server…",
    };
  }

  if (!loaded) {
    return {
      busy: true,
      kind: "loading",
      text: "Loading the page. The first visit to a route can take a while.",
    };
  }

  return null;
};

const routeHint = (layout: CanvasLayout): Hint | null => {
  if (layout.frames.some((frame) => frame.path !== undefined)) {
    return null;
  }

  return {
    busy: false,
    kind: "route",
    text: "This frame shows the home route. Pick the page you want to design.",
  };
};

const HintIcon = ({ hint }: { hint: Hint }): ReactElement => {
  if (hint.busy) {
    return <span className="spinner" aria-hidden="true" />;
  }

  return <Icon name={hint.kind === "route" ? "file" : "alert"} size={14} />;
};

const AppStageHint = ({
  hint,
  onClose,
}: {
  hint: Hint;
  onClose: () => void;
}): ReactElement => (
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
          {copy.pickARoute}
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

const useRouteRequests = (
  projectId: string,
  isApp: boolean,
  addRoute: (route: string) => void
): void => {
  const add = useRef(addRoute);
  add.current = addRoute;
  useEffect(() => {
    if (!isApp) {
      return;
    }

    const runPending = (): boolean => {
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

    const onRoute = (event: Event): void => {
      const { detail } = event as CustomEvent<{
        projectId?: string;
        route?: string;
      }>;

      if (detail?.projectId === projectId && detail.route) {
        add.current(detail.route);
      }
    };

    globalThis.addEventListener(OPEN_ROUTE_EVENT, onRoute);

    return (): void => {
      unsubscribe?.();
      globalThis.removeEventListener(OPEN_ROUTE_EVENT, onRoute);
    };
  }, [projectId, isApp]);
};

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

const useAppCanvas = (
  appCanvasInput: AppCanvasInput
): {
  bar: ReactNode;
  note: ReactNode;
  stage: ReactNode;
} => {
  const addRoute = (route: string): void => {
    const shown = routeFrameId(appCanvasInput.frames.layout, route) !== null;

    if (!shown && !canAddFrame(appCanvasInput.frames.layout)) {
      appCanvasInput.notify(
        "The canvas has the most frames it can hold. Remove one to add this route."
      );

      return;
    }

    appCanvasInput.freeze();
    appCanvasInput.frames.update((layout) =>
      addRouteFrame(layout, route, appCanvasInput.size)
    );
    appCanvasInput.focus();
    appCanvasInput.notify(
      shown
        ? `${route} is already on the canvas. Showing it.`
        : `Added a frame for ${route}`
    );
  };

  useRouteRequests(
    appCanvasInput.projectId,
    Boolean(appCanvasInput.app),
    addRoute
  );
  const redirect = useRedirectNote(
    appCanvasInput.listen,
    Boolean(appCanvasInput.app),
    appCanvasInput.resetKey
  );
  const status = useAppStatus(appCanvasInput.projectId);
  const loaded = useServerFrames(
    status,
    appCanvasInput.listen,
    Boolean(appCanvasInput.app)
  );
  const [routeDismissed, setRouteDismissed] = useState(false);
  const [hidden, setHidden] = useState(() => readHiddenRedirects());

  const key = redirect
    ? `${appCanvasInput.projectId} ${redirect.from}>${redirect.to}`
    : null;

  const shownRedirect =
    appCanvasInput.app && redirect && key && !hidden.includes(key)
      ? redirect
      : null;

  const hint = appCanvasInput.app
    ? (serverHint(appCanvasInput.app, status, loaded) ??
      (routeDismissed || shownRedirect
        ? null
        : routeHint(appCanvasInput.frames.layout)))
    : null;

  const hide = (value: string): void => {
    const next = [...hidden.filter((item) => item !== value), value].slice(
      -MAX_HIDDEN_REDIRECTS
    );

    writeHiddenRedirects(next);
    setHidden(next);
  };

  const dismissRedirect = (): void => {
    if (key) {
      hide(key);
    }
  };

  const signIn = (): void => {
    dismissRedirect();
    appCanvasInput.onSignIn();
  };

  return {
    bar: appCanvasInput.app ? (
      <AppCanvasBar
        projectId={appCanvasInput.projectId}
        app={appCanvasInput.app}
        onAddRoute={addRoute}
      />
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
};

export { useAppCanvas };
