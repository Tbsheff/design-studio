import type { PortStartResult } from "@design-studio/contracts/port";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { uiStore } from "../../platform/storage.js";
import { COPY } from "./copy.js";
import { StartedBody } from "./port-started-body.js";

const Started = ({
  result,
  appName,
  onClose,
}: {
  result: PortStartResult;
  appName: string;
  onClose: () => void;
}): ReactElement => {
  const { projectId } = result;

  const handleOpen = useCallback((): void => {
    onClose();
    uiStore.set({ activeProjectId: projectId });
  }, [onClose, projectId]);

  return (
    <>
      <StartedBody result={result} appName={appName} />
      <div className="modal-foot">
        <span className="port-spacer" />
        <button type="button" className="btn ghost" onClick={onClose}>
          {COPY.labelClose}
        </button>
        <button
          type="button"
          className="btn primary"
          data-autofocus
          onClick={handleOpen}
        >
          {`${COPY.textOpen}${appName}`}
        </button>
      </div>
    </>
  );
};

export { Started };
