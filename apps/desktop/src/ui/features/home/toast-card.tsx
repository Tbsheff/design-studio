import { useCallback } from "react";
import type { ReactElement } from "react";

import { toToastClass } from "./home-toast-model.js";
import type { HomeToastState } from "./home-toast-model.js";
import { ToastAction } from "./toast-action.js";
import { ToastDismiss } from "./toast-dismiss.js";

const ToastCard = ({
  toast,
  onHold,
  onDone,
}: {
  readonly toast: HomeToastState;
  readonly onHold: (isHeld: boolean) => void;
  readonly onDone: () => void;
}): ReactElement => {
  const hold = useCallback((): void => {
    onHold(true);
  }, [onHold]);

  const release = useCallback((): void => {
    onHold(false);
  }, [onHold]);

  return (
    <div
      className={toToastClass(toast.hasError)}
      onMouseEnter={hold}
      onMouseLeave={release}
      onFocus={hold}
      onBlur={release}
    >
      <span className="home-toast-text">{toast.text}</span>
      {toast.action && <ToastAction action={toast.action} onDone={onDone} />}
      {toast.more && <ToastAction action={toast.more} onDone={onDone} />}
      <ToastDismiss onDone={onDone} />
    </div>
  );
};

export { ToastCard };
