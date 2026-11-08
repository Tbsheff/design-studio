import { useCallback } from "react";
import type { ReactElement } from "react";

import { pick } from "../../platform/pick.js";

type ServerAction = "start" | "stop" | "restart";

interface ServerActionButtonProps {
  readonly action: ServerAction;
  readonly isGhost: boolean;
  readonly control: (action: ServerAction) => void;
  readonly label: string;
}

const ServerActionButton = ({
  action,
  isGhost,
  control,
  label,
}: ServerActionButtonProps): ReactElement => {
  const sendAction = useCallback(() => control(action), [action, control]);

  const className = pick(isGhost, "btn small ghost", "btn small");

  return (
    <button type="button" className={className} onClick={sendAction}>
      {label}
    </button>
  );
};

export { ServerActionButton };

export type { ServerAction };
