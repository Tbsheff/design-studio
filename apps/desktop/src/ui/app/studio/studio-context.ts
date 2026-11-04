import type { Project } from "@design-studio/actions/_core/contracts";
import type { StudioCore } from "./studio-core-types";
import type { StudioRun } from "./studio-run-types";
import type { StudioPanes, StudioUi } from "./studio-ui-types";

interface StudioCtx {
  projectId: string;
  onExit: () => void;
  project: Project;
  ui: StudioUi;
  panes: StudioPanes;
  core: StudioCore;
  run: StudioRun;
  openShip: (() => void) | null;
}

interface StudioCtxProps {
  ctx: StudioCtx;
}

export type { StudioCtx, StudioCtxProps };
