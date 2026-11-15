import type { ReactElement } from "react";

import { ColorPickerSlot } from "../../domain/color-picker-slot.js";
import { COLUMN_COPY } from "./copy";
import { toColorPicker } from "./studio-column-body";
import { StudioComments } from "./studio-comments";
import type { StudioCtxProps } from "./studio-context";
import { StudioEditPane } from "./studio-edit-pane";

const StudioInspector = ({ ctx }: StudioCtxProps): ReactElement => {
  const { panes, ui } = ctx;
  const isOpen = panes.isInspectorOpen || ui.isCommentsShown;

  return (
    <aside
      className="studio-inspector"
      aria-label={COLUMN_COPY.inspector}
      data-popover-boundary=""
      hidden={!isOpen}
    >
      {ui.isCommentsShown && <StudioComments ctx={ctx} />}
      <ColorPickerSlot.Provider value={toColorPicker}>
        <StudioEditPane ctx={ctx} />
      </ColorPickerSlot.Provider>
    </aside>
  );
};

export { StudioInspector };
