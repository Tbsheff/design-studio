import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const ToastDismiss = ({
  onDone,
}: {
  readonly onDone: () => void;
}): ReactElement => (
  <button
    type="button"
    className="icon-btn"
    aria-label={copy.dismiss}
    onClick={onDone}
  >
    <Icon name="close" size={14} />
  </button>
);

export { ToastDismiss };
