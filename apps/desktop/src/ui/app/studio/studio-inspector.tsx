import type { ReactElement } from "react";

import { COLUMN_COPY } from "./copy";
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
      <StudioEditPane ctx={ctx} />
    </aside>
  );
};

export { StudioInspector };
