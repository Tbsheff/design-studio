import type { AttachedApp } from "@design-studio/contracts";
import type { ReactElement } from "react";
import { lazy, Suspense } from "react";

const AppBar = lazy(() => import("../../app/shell/app-bar.js"));

const AppCanvasBar = ({
  projectId,
  app,
  onAddRoute,
}: {
  projectId: string;
  app: AttachedApp;
  onAddRoute: (route: string) => void;
}): ReactElement => (
  <div className="app-canvas-bar">
    <Suspense fallback={null}>
      <AppBar projectId={projectId} app={app} onAddRoute={onAddRoute} />
    </Suspense>
  </div>
);

export { AppCanvasBar };
