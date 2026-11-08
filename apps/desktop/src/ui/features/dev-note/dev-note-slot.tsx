import type { ReactElement } from "react";

import { DevNoteDialog } from "./dev-note-dialog.js";
import { DevNoteListDialog } from "./dev-note-list-dialog.js";
import type { DevNoteHost } from "./use-dev-note-host.js";

interface DevNoteSlotProps {
  readonly host: DevNoteHost;
}

const DevNoteSlot = ({ host }: DevNoteSlotProps): ReactElement | null => {
  const { opened } = host;
  const handleClose = host.close;
  const handleSelect = host.select;

  if (opened === null) {
    return null;
  }

  if (opened.mode === "list") {
    return (
      <DevNoteListDialog
        frameId={opened.frameId}
        frameName={opened.frameName}
        onClose={handleClose}
        onSelect={handleSelect}
        projectId={opened.projectId}
      />
    );
  }

  return (
    <DevNoteDialog
      frameId={opened.frameId}
      layerId={opened.layerId}
      layerName={opened.layerName}
      onClose={handleClose}
      projectId={opened.projectId}
      source={opened.source}
    />
  );
};

export { DevNoteSlot };

export type { DevNoteSlotProps };
