import type { AppServerStatus, AttachedApp } from "@design-studio/contracts";

import type { Hint } from "./app-hint-types.js";
import type { CanvasLayout } from "./canvas-frames-model.js";

const toServerName = (app: AttachedApp): string => {
  if (app.framework === "next") {
    return "Next.js";
  }

  return "App";
};

const toStartingText = (app: AttachedApp, isManaged: boolean): string => {
  if (!isManaged) {
    return "Checking your dev server…";
  }

  if (app.framework === "next") {
    return "Starting next dev…";
  }

  return "Starting the dev server…";
};

const toFailedHint = (app: AttachedApp, isManaged: boolean): Hint => {
  let part = "Your dev server does not answer";

  if (isManaged) {
    part = "The dev server is not running";
  }

  return {
    busy: false,
    kind: "failed",
    text: `${part}. Press ${toServerName(app)} at the bottom left for the fix.`,
  };
};

const serverHint = (
  app: AttachedApp,
  status: AppServerStatus | null,
  isLoaded: boolean
): Hint | null => {
  const isManaged = (status?.mode ?? app.mode) === "managed";
  const state = status?.state ?? "idle";

  if (state === "failed" || state === "stopped") {
    return toFailedHint(app, isManaged);
  }

  if (state !== "ready") {
    return {
      busy: true,
      kind: "starting",
      text: toStartingText(app, isManaged),
    };
  }

  if (!isLoaded) {
    return {
      busy: true,
      kind: "loading",
      text: "Loading the page. The first visit to a route can take a while.",
    };
  }

  return null;
};

const routeHint = (layout: CanvasLayout): Hint | null => {
  if (layout.frames.some((frame) => (frame.path ?? null) !== null)) {
    return null;
  }

  return {
    busy: false,
    kind: "route",
    text: "This frame shows the home route. Pick the page you want to design.",
  };
};

export { routeHint, serverHint };
