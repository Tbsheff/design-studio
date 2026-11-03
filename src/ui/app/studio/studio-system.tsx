import { useCallback } from "react";
import type { ReactElement } from "react";

import {
  DesignSystemChip,
  designSystemRef,
} from "../../components/DesignSystemChip";
import { EDIT_DESIGN_LABEL, SYSTEM_TEXT } from "./copy";
import { RulesSlot } from "./layers";
import type { StudioCtxProps } from "./studio-context";

const StudioSystem = ({ ctx }: StudioCtxProps): ReactElement => {
  const { projectId, project, ui, core } = ctx;
  const { setDesignOpen } = ui;

  const openDesign = useCallback(
    (): void => setDesignOpen(true),
    [setDesignOpen]
  );

  return (
    <>
      <p className="pane-system-text">{SYSTEM_TEXT}</p>
      <div className="pane-system-actions">
        <DesignSystemChip
          system={designSystemRef(
            projectId,
            core.directionId,
            project,
            core.designSystem.state
          )}
          actions={core.packActions.actions}
          onOpenDesignMd={openDesign}
        />
        <button type="button" className="btn small" onClick={openDesign}>
          {EDIT_DESIGN_LABEL}
        </button>
      </div>
      <RulesSlot projectId={projectId} directionId={core.directionId} />
    </>
  );
};

export { StudioSystem };
