import type { ReactElement } from "react";

import { StudioBoot } from "../components/StudioParts";
import { StudioReady } from "./studio/studio-ready";
import { useStudioCompose } from "./studio/use-studio-compose";
import { useStudioPanes } from "./studio/use-studio-panes";
import { useStudioState } from "./studio/use-studio-state";

interface StudioProps {
  projectId: string;
  onExit: () => void;
}

const Studio = ({ projectId, onExit }: StudioProps): ReactElement => {
  const ui = useStudioState();
  const panes = useStudioPanes(projectId, ui);
  const core = useStudioCompose(projectId, ui, panes);
  const { project } = core;

  if (core.data.loadError || !project) {
    return <StudioBoot message={core.data.loadError || null} onExit={onExit} />;
  }

  return (
    <StudioReady
      projectId={projectId}
      onExit={onExit}
      project={project}
      ui={ui}
      panes={panes}
      core={core}
    />
  );
};

export { Studio };
