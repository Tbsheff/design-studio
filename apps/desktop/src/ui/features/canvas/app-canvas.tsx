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
import { canAddFrame } from "./canvas-frame-ops.js";
import { canvasStore } from "./canvas-frames-model.js";
import type { CanvasLayout } from "./canvas-frames-model.js";
import { FrameRedirectNote } from "./canvas-frames.js";
import { copy } from "./copy.js";

const LOAD_HINT_MS = 30_000;

const reloadAppFrames = (): void => {
  const frames = document.querySelectorAll<HTMLIFrameElement>(
    ".stage iframe.frame"
  );

  for (const el of frames) {
    const { src } = el;

    if (src) {
      el.src = src;
    }
  }
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
      return;
    }

    const timer = globalThis.setTimeout(() => setLoaded(true), LOAD_HINT_MS);

    return (): void => globalThis.clearTimeout(timer);
  }, [ready, loaded]);
  useEffect(() => {
    if (!enabled) {
      return;
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
  let name: "Next.js" | "App" = "App";

  if (app.framework === "next") {
    name = "Next.js";
  }

  const managed = (status?.mode ?? app.mode) === "managed";
  const state = status?.state ?? "idle";

  if (state === "failed" || state === "stopped") {
    let part:
      | "The dev server is not running"
      | "Your dev server does not answer" = "Your dev server does not answer";

    if (managed) {
      part = "The dev server is not running";
    }

    return {
      busy: false,
      kind: "failed",
      text: `${part}. Press ${name} at the bottom left for the fix.`,
    };
  }

  if (state !== "ready") {
    let text2 = "Checking your dev server…";

    if (managed) {
      let part2: "next dev" | "the dev server" = "the dev server";

      if (app.framework === "next") {
        part2 = "next dev";
      }

      text2 = `Starting ${part2}…`;
    }

    return {
      busy: true,
      kind: "starting",
      text: text2,
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

  let name2: "alert" | "file" = "alert";

  if (hint.kind === "route") {
    name2 = "file";
  }

  return <Icon name={name2} size={14} />;
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

    let unsubscribe: (() => void) | null = null;

    if (!runPending()) {
      unsubscribe = canvasStore.subscribe(() =>
        queueMicrotask(() => runPending() && unsubscribe?.())
      );
    }

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

    let argument = `Added a frame for ${route}`;

    if (shown) {
      argument = `${route} is already on the canvas. Showing it.`;
    }

    appCanvasInput.notify(argument);
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

  let key: string | null = null;

  if (redirect) {
    key = `${appCanvasInput.projectId} ${redirect.from}>${redirect.to}`;
  }

  let shownRedirect: { from: string; to: string } | null = null;

  if (appCanvasInput.app && redirect && key && !hidden.includes(key)) {
    shownRedirect = redirect;
  }

  let hint: Hint | null = null;

  if (appCanvasInput.app) {
    hint =
      serverHint(appCanvasInput.app, status, loaded) ??
      (routeDismissed || shownRedirect
        ? null
        : routeHint(appCanvasInput.frames.layout));
  }

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

  let bar2: ReactNode = null;

  if (appCanvasInput.app) {
    bar2 = (
      <AppCanvasBar
        projectId={appCanvasInput.projectId}
        app={appCanvasInput.app}
        onAddRoute={addRoute}
      />
    );
  }

  let note2: ReactNode = null;

  if (shownRedirect) {
    note2 = (
      <FrameRedirectNote
        redirect={shownRedirect}
        onSignIn={signIn}
        onDismiss={dismissRedirect}
      />
    );
  }

  let stage2: ReactNode = null;

  if (hint) {
    stage2 = (
      <AppStageHint hint={hint} onClose={() => setRouteDismissed(true)} />
    );
  }

  return {
    bar: bar2,
    note: note2,
    stage: stage2,
  };
};

export { useAppCanvas };
