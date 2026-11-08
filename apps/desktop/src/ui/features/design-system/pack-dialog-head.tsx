import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

const PackDialogHead = ({
  isBusy,
  onClose,
  text,
  title,
}: {
  isBusy: boolean;
  onClose: () => void;
  text: string;
  title: string;
}): ReactElement => (
  <div className="modal-head">
    <div className="titles">
      <h2>{title}</h2>
      <p>{text}</p>
    </div>
    <button
      type="button"
      className="icon-btn"
      aria-label={`Close ${title}`}
      onClick={onClose}
      disabled={isBusy}
    >
      <Icon name="close" />
    </button>
  </div>
);

export { PackDialogHead };
