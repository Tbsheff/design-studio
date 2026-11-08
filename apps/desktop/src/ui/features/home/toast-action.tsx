import { useCallback } from "react";
import type { ReactElement } from "react";

import type { ToastAction as ToastActionState } from "./home-toast-model.js";

const ToastAction = ({
  action,
  onDone,
}: {
  readonly action: ToastActionState;
  readonly onDone: () => void;
}): ReactElement => {
  const runAction = useCallback((): void => {
    action.run();
    onDone();
  }, [action, onDone]);

  return (
    <button type="button" className="btn small" onClick={runAction}>
      {action.label}
    </button>
  );
};

export { ToastAction };
