import { Icon } from "@design-studio/ui";
import type { ReactNode } from "react";

const ALERT_SIZE = 13;

interface Props {
  readonly message: string | null;
}

const TokensPanelError = ({ message }: Props): ReactNode => {
  if (!message) {
    return null;
  }

  return (
    <p className="ins-error" role="alert">
      <Icon name="alert" size={ALERT_SIZE} />
      {message}
    </p>
  );
};

export { TokensPanelError };
