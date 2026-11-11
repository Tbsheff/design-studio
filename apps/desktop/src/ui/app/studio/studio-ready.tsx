import type { CommentPrefill, Project } from "@design-studio/contracts";
import { useCallback, useMemo } from "react";
import type { ReactElement } from "react";

import { useBindStudioCommands } from "./bind-studio-commands";
import { DataModelLayer } from "./data-model-layer";
import { DevStatusLayer } from "./dev-status-layer";
import { ImpactLayer } from "./impact-layer";
import { MarkupLayer } from "./markup-layer";
import { openAttr, shipOpener } from "./project-model";
import { ScreenLayer } from "./screen-layer";
import { StudioBody } from "./studio-body";
import type { StudioCtx } from "./studio-context";
import type { StudioCore } from "./studio-core-types";
import { StudioRight } from "./studio-right";
import { StudioTop } from "./studio-top";
import type { StudioPanes, StudioUi } from "./studio-ui-types";
import { TextRangeLayer } from "./text-range-layer";
import { usePrototypeFollow } from "./use-prototype-follow";
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

  const { prefillChat } = ui;

  const handleAttach = useCallback(
    (prefill: CommentPrefill): void => prefillChat.current(prefill),
    [prefillChat]
  );

  useBindStudioCommands(ctx);
  usePrototypeFollow(project);

  return (
    <div
      className="studio"
      data-column={openAttr(ui.editorColumn.isOpen)}
      data-inspector={openAttr(panes.isInspectorOpen || ui.isCommentsShown)}
      data-rail={ui.rail}
    >
      <StudioTop ctx={ctx} />
      {ui.topEnd && <StudioBody ctx={ctx} />}
      <StudioRight ctx={ctx} />
      <DevStatusLayer projectId={projectId} />
      <ImpactLayer directionId={core.directionId} projectId={projectId} />
      <ScreenLayer projectId={projectId} />
      <DataModelLayer draft={ui.draft} />
      <MarkupLayer
        directionId={core.directionId}
        onAttach={handleAttach}
        projectId={projectId}
      />
      <TextRangeLayer
        directionId={core.directionId}
        port={ui.port}
        projectId={projectId}
        selection={ui.selection}
      />
    </div>
  );
};

export { StudioReady };
