import { Suspense } from "react";
import type { ReactElement } from "react";

import { chatWidthStyle } from "../../features/chat/index.js";
import { focusNewProject } from "../../features/commands";
import { ProjectRail } from "../../features/home/index.js";
import { PanelRail } from "../shell/panel-rail";
import { StudioCenter } from "./studio-center";
import { StudioColumn } from "./studio-column";
import type { StudioCtxProps } from "./studio-context";
import { StudioInspector } from "./studio-inspector";
import { StudioLeft } from "./studio-left";

const StudioBody = ({ ctx }: StudioCtxProps): ReactElement => {
  const { core, onExit, panes, projectId, ui } = ctx;
  const { guard } = core;
  const { openColumn: handlePick } = panes;
  const { columnsRef } = ui;
  const handleHome = guard(onExit);

  const handleNewPrototype = guard((): void => {
    onExit();
    focusNewProject();
  });

  const columns = (
    <div
      className="columns"
      ref={columnsRef}
      style={chatWidthStyle(ui.chatWidth)}
    >
      <StudioLeft ctx={ctx} />
      <StudioColumn ctx={ctx} />
      <StudioCenter ctx={ctx} />
      <StudioInspector ctx={ctx} />
    </div>
  );

  return (
    <div className="studio-body">
      <PanelRail column={ui.editorColumn} onPick={handlePick} />
      {ui.rail === "open" && (
        <Suspense fallback={null}>
          <ProjectRail
            projectId={projectId}
            onHome={handleHome}
            onNewPrototype={handleNewPrototype}
          />
        </Suspense>
      )}
      {columns}
    </div>
  );
};

export { StudioBody };
