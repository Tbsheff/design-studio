import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

const CLOSE_ICON_SIZE = 14;

const QueuedRemove = ({ onRemove }: { onRemove: () => void }): ReactElement => (
  <button
    type="button"
    className="icon-btn small queued-remove"
    aria-label={copy.removeQueuedMessage}
    data-tip={copy.remove}
    data-tip-side="top"
    onClick={onRemove}
  >
    <Icon name="close" size={CLOSE_ICON_SIZE} />
  </button>
);

export { QueuedRemove };
