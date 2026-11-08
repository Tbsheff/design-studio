import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

interface AppFailureHeadProps {
  readonly onClose: () => void;
  readonly title: string;
}

const AppFailureHead = ({
  onClose,
  title,
}: AppFailureHeadProps): ReactElement => (
  <div className="app-fail-head">
    <Icon name="alert" size={14} />
    <strong className="grow">{title}</strong>
    <button
      type="button"
      className="icon-btn small"
      aria-label="Dismiss"
      data-tip="Dismiss"
      onClick={onClose}
    >
      <Icon name="close" size={12} />
    </button>
  </div>
);

export { AppFailureHead };
