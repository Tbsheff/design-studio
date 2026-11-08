import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface Props {
  readonly message: string;
  readonly onDismiss: () => void;
}

const ALERT_ICON_SIZE = 14;

const CLOSE_ICON_SIZE = 12;

const SessionError = ({ message, onDismiss }: Props): ReactElement => (
  <div className="ins-error" role="alert">
    <Icon name="alert" size={ALERT_ICON_SIZE} />
    <span>{message}</span>
    <button
      type="button"
      className="icon-btn small"
      aria-label={copy.dismiss}
      onClick={onDismiss}
    >
      <Icon name="close" size={CLOSE_ICON_SIZE} />
    </button>
  </div>
);

export { SessionError };
