import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { RetryButton } from "./retry-button.js";

const ALERT_ICON_SIZE = 13;

const ComponentsError = ({
  message,
  onRetry,
}: {
  message: string | null;
  onRetry: (() => void) | null;
}): ReactElement | null => {
  if (!message) {
    return null;
  }

  return (
    <p className="ins-error" role="alert">
      <Icon name="alert" size={ALERT_ICON_SIZE} />
      <span>
        {COPY.textCouldNotListComponents}
        {message}
      </span>
      <RetryButton onRetry={onRetry} />
    </p>
  );
};

export { ComponentsError };
