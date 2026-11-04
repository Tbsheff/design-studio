import { useCallback } from "react";
import type { ReactElement } from "react";

import { StudioModals, StudioToast } from "../shell/studio-parts";
import { ExportLayer } from "./export-layer";
import { firstText } from "./request-model";
import { ShareLayer } from "./share-layer";
import { ShipLayer } from "./ship-layer";
import type { StudioCtxProps } from "./studio-context";

const StudioRight = ({ ctx }: StudioCtxProps): ReactElement => {
  const { projectId, project, ui, core } = ctx;
  const { setDesignOpen, setSettingsOpen, setShareTarget, setShipOpen } = ui;
  const handleSaved = core.data.setProject;
  const handleExportClose = core.exporter.close;

  const handleCloseDesign = useCallback(
    (): void => setDesignOpen(false),
    [setDesignOpen]
  );

  const handleCloseSettings = useCallback(
    (): void => setSettingsOpen(false),
    [setSettingsOpen]
  );

  const handleCloseShip = useCallback(
    (): void => setShipOpen(false),
    [setShipOpen]
  );

  const handleCloseShare = useCallback(
    (): void => setShareTarget(null),
    [setShareTarget]
  );

  return (
    <>
      <StudioModals
        project={project}
        designOpen={ui.designOpen}
        settingsOpen={ui.settingsOpen}
        onSaved={handleSaved}
        onCloseDesign={handleCloseDesign}
        onCloseSettings={handleCloseSettings}
      />
      <ExportLayer target={core.exporter.target} onClose={handleExportClose} />
      <ShipLayer
        projectId={projectId}
        open={ui.shipOpen}
        onClose={handleCloseShip}
      />
      <ShareLayer target={ui.shareTarget} onClose={handleCloseShare} />
      <StudioToast
        text={firstText(core.editHistory.toast, core.packActions.toast?.text)}
      />
    </>
  );
};

export { StudioRight };
