import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

interface PaneErrorProps {
  readonly error: string;
  readonly onDismiss: () => void;
}

const PaneError = ({ error, onDismiss }: PaneErrorProps): ReactElement => (
  <div className="pane-error ui-notice" role="alert">
    <Icon name="alert" size={14} />
    <span className="pane-error-text">{error}</span>
    <button
      type="button"
      className="icon-btn small"
      aria-label="Dismiss"
      onClick={onDismiss}
    >
      <Icon name="close" size={12} />
    </button>
  </div>
);

export { PaneError };
