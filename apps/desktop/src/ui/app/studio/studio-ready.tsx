import type { Project } from "@design-studio/contracts";
import { useMemo } from "react";
import type { ReactElement } from "react";

import { chatWidthStyle } from "../../features/chat/index.js";
import { focusNewProject } from "../../features/commands";
import { ProjectRail } from "../../features/home/project-rail";
import { useBindStudioCommands } from "./bind-studio-commands";
import { paneAttr, shipOpener } from "./project-model";
import { StudioCenter } from "./studio-center";
import type { StudioCtx } from "./studio-context";
import type { StudioCore } from "./studio-core-types";
import { StudioLeft } from "./studio-left";
import { StudioRight } from "./studio-right";
import type { StudioPanes, StudioUi } from "./studio-ui-types";
import { useStudioRun } from "./use-studio-run";

interface StudioReadyProps {
  projectId: string;
  onExit: () => void;
  project: Project;
  ui: StudioUi;
  panes: StudioPanes;
  core: StudioCore;
}

const StudioReady = (props: StudioReadyProps): ReactElement => {
  const { projectId, onExit, project, ui, panes, core } = props;
  const run = useStudioRun({ core, panes, project, projectId, ui });

  const openShip = shipOpener(project, ui.setShipOpen);

  const ctx = useMemo(
    (): StudioCtx => ({
      core,
      onExit,
      openShip,
      panes,
      project,
      projectId,
      run,
      ui,
    }),
    [core, onExit, openShip, panes, project, projectId, run, ui]
  );

  const { columnsRef } = ui;

  useBindStudioCommands(ctx);
  const handleHome = core.guard(onExit);

  const handleNewPrototype = core.guard((): void => {
    onExit();
    focusNewProject();
  });

  return (
    <div
      className="studio"
      data-pane={paneAttr(ui.paneCollapsed)}
      data-rail={ui.rail}
    >
      <ProjectRail
        projectId={projectId}
        onHome={handleHome}
        onNewPrototype={handleNewPrototype}
      />
      <div
        className="columns"
        ref={columnsRef}
        style={chatWidthStyle(ui.chatWidth)}
      >
        <StudioLeft ctx={ctx} />
        <StudioCenter ctx={ctx} />
      </div>
      <StudioRight ctx={ctx} />
    </div>
  );
};

export { StudioReady };
