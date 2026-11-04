import type { ReactElement } from "react";

import { PropDialog } from "./prop-dialog.js";
import { PropPanel } from "./prop-panel.js";
import type { PropPanelProps } from "./prop-panel.js";

interface PropSlotProps extends PropPanelProps {
  readonly isDialog: boolean;
}

const PropSlot = ({
  isDialog,
  layer,
  onClose,
  onDone,
  target,
}: PropSlotProps): ReactElement => {
  if (isDialog) {
    return (
      <PropDialog
        layer={layer}
        onClose={onClose}
        onDone={onDone}
        target={target}
      />
    );
  }

  return (
    <PropPanel
      layer={layer}
      onClose={onClose}
      onDone={onDone}
      target={target}
    />
  );
};

export { PropSlot };

export type { PropSlotProps };
