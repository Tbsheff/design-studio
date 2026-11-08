import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const ToastHead = ({
  title,
  onDrop,
}: {
  title: string;
  onDrop: () => void;
}): ReactElement => (
  <div className="mcp-toast-head">
    <span>{title}</span>
    <span className="spacer" />
    <button
      type="button"
      className="icon-btn small"
      aria-label={copy.hide}
      onClick={onDrop}
    >
      <Icon name="close" size={14} />
    </button>
  </div>
);

export { ToastHead };
