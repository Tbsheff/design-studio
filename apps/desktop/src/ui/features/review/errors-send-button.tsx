import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface ErrorsSendButtonProps {
  readonly onSend: () => void;
}

const ErrorsSendButton = ({ onSend }: ErrorsSendButtonProps): ReactElement => (
  <button type="button" className="btn small has-icon" onClick={onSend}>
    <Icon name="sparkle" size={14} />
    {copy.sendToAgent}
  </button>
);

export { ErrorsSendButton };
