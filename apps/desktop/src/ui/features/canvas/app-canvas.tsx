import type { AttachedApp } from "@design-studio/contracts";
import { useCallback, useState } from "react";
import type { ReactNode } from "react";

import { useAppStatus } from "../../platform/app-status.js";
import type { Listen } from "./app-canvas-routes-model.js";
import { AppCanvasBar } from "./app-canvas-routes.js";
import type { Hint } from "./app-hint-types.js";
import { routeHint, serverHint } from "./app-hints-model.js";
import { AppStageHint } from "./app-stage-hint.js";
import type { CanvasLayout } from "./canvas-frames-model.js";
import { FrameRedirectNote } from "./frame-redirect-note.js";
import { useAddRoute } from "./use-add-route.js";
import { useHiddenRedirects } from "./use-hidden-redirects.js";
import { useRedirectNote } from "./use-redirect-note.js";
import { useRouteRequests } from "./use-route-requests.js";
import { useServerFrames } from "./use-server-frames.js";

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

interface AppCanvasSlots {
  readonly bar: ReactNode;
  readonly note: ReactNode;
  readonly stage: ReactNode;
}

const toHint = (
  app: AttachedApp | null | undefined,
  hint: Hint | null,
  isQuiet: boolean,
  layout: CanvasLayout
): Hint | null => {
  if (!app) {
    return null;
  }

  if (hint) {
    return hint;
  }

  if (isQuiet) {
    return null;
  }

  return routeHint(layout);
};

const useAppCanvas = (input: AppCanvasInput): AppCanvasSlots => {
  const { app, listen, projectId, resetKey } = input;
  const { onSignIn } = input;
  const isApp = Boolean(app);

  const addRoute = useAddRoute({
    focus: input.focus,
    freeze: input.freeze,
    layout: input.frames.layout,
    notify: input.notify,
    size: input.size,
    update: input.frames.update,
  });

  useRouteRequests(projectId, isApp, addRoute);

  const redirect = useRedirectNote(listen, isApp, resetKey);
  const status = useAppStatus(projectId);
  const isLoaded = useServerFrames(status, listen, isApp);
  const [isRouteDismissed, setIsRouteDismissed] = useState(false);
  const { dismiss, shown } = useHiddenRedirects(projectId, redirect, isApp);
  const closeHint = useCallback(() => setIsRouteDismissed(true), []);

  const signIn = useCallback((): void => {
    dismiss();
    onSignIn();
  }, [dismiss, onSignIn]);

  let hint: Hint | null = null;

  if (app) {
    hint = toHint(
      app,
      serverHint(app, status, isLoaded),
      isRouteDismissed || shown !== null,
      input.frames.layout
    );
  }

  let bar: ReactNode = null;
  let note: ReactNode = null;
  let stage: ReactNode = null;

  if (app) {
    bar = (
      <AppCanvasBar projectId={projectId} app={app} onAddRoute={addRoute} />
    );
  }

  if (shown) {
    note = (
      <FrameRedirectNote
        redirect={shown}
        onSignIn={signIn}
        onDismiss={dismiss}
      />
    );
  }

  if (hint) {
    stage = <AppStageHint hint={hint} onClose={closeHint} />;
  }

  return { bar, note, stage };
};

export { useAppCanvas };

export type { AppCanvasSlots };
