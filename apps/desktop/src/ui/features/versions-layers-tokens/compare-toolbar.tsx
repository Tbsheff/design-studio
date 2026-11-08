import { Icon } from "@design-studio/ui";
import type { ReactNode } from "react";

import { COPY } from "./copy.js";

const CLOSE_ICON_SIZE = 14;

interface CompareToolbarProps {
  readonly height: number;
  readonly children: ReactNode;
  readonly onClose: () => void;
  readonly width: number;
}

const CompareToolbar = ({
  height,
  children,
  onClose,
  width,
}: CompareToolbarProps): ReactNode => (
  <div className="toolbar">
    <Icon name="compare" />
    <strong className="toolbar-title">{COPY.compareTitle}</strong>
    <span className="dims-readout">
      {width}
      {COPY.compareBy}
      {height}
    </span>
    {children}
    <div className="spacer" />
    <button type="button" className="btn small has-icon" onClick={onClose}>
      <Icon name="close" size={CLOSE_ICON_SIZE} />
      {COPY.compareClose}
    </button>
  </div>
);

export { CompareToolbar };
